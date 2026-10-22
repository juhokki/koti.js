import asyncio
import base64
import json
import logging
import time
import urllib.request
from pathlib import Path

from bleak import BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

from .decoder import RUUVI_MANUFACTURER_ID, decode
from .settings import Settings, load_settings
from .value import Value
from .write_buffer import WriteBuffer

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 30


class RuuviSensor:
    def __init__(self, settings_file: Path) -> None:
        self.settings: Settings = load_settings(settings_file)
        self.write_buffer: WriteBuffer | None = (
            WriteBuffer(self.settings.write_buffer.interval, self.write)
            if self.settings.write_buffer.enabled
            else None
        )
        self._scanner: BleakScanner | None = None
        self._tasks: set[asyncio.Task[None]] = set()

    async def start(self) -> None:
        logger.info("Starting Ruuvi sensor.")

        self._scanner = BleakScanner(detection_callback=self._on_advertisement)
        await self._scanner.start()

        if self.write_buffer:
            self.write_buffer.start()

    async def stop(self) -> None:
        logger.info("Stopping Ruuvi sensor.")

        if self._scanner:
            await self._scanner.stop()
            self._scanner = None

        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)

        if self.write_buffer:
            try:
                await self.write_buffer.stop()
            except Exception:
                logger.exception("Failed to write buffered values.")

    def _on_advertisement(self, device: BLEDevice, data: AdvertisementData) -> None:
        payload = data.manufacturer_data.get(RUUVI_MANUFACTURER_ID)
        if payload is None:
            return

        task = asyncio.create_task(self._handle_update(_tag_id(device.address), bytes(payload)))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _handle_update(self, tag_id: str, payload: bytes) -> None:
        try:
            values = self.parse_data(tag_id, payload)

            if not values:
                logger.warning("No value attribute was recognized, skipping value.")
                return

            if self.write_buffer:
                self.write_buffer.buffer(values)
            else:
                await self.write(values)
        except Exception:
            logger.exception("Failed to handle tag update.")

    def parse_data(self, tag_id: str, payload: bytes) -> list[Value]:
        now = int(time.time() * 1000)
        values = [
            Value(tag_id, measurement_id, value, decimals, now)
            for measurement_id, value, decimals in decode(payload)
        ]

        logger.debug("Parsed %d values from Ruuvi device with id %s.", len(values), tag_id)
        return values

    async def write(self, values: list[Value]) -> None:
        try:
            await asyncio.to_thread(self._post, values)
            logger.debug("Sent %d values to remote host.", len(values))
        except Exception:
            logger.exception("Failed to send values to remote host.")

    def _post(self, values: list[Value]) -> None:
        url = f"{self.settings.url}/api/values"
        credentials = f"{self.settings.api.username}:{self.settings.api.password}"
        basic = base64.b64encode(credentials.encode()).decode()
        request = urllib.request.Request(
            url,
            data=json.dumps([value.to_dict() for value in values]).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {basic}",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS):
            pass


def _tag_id(address: str) -> str:
    # Same id format as node-ruuvitag: lowercase MAC without separators.
    return address.replace(":", "").replace("-", "").lower()
