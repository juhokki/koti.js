import asyncio
import logging
from collections.abc import Awaitable, Callable

from .value import Value

logger = logging.getLogger(__name__)


class WriteBuffer:
    """Collects values and periodically writes the average per device and measurement."""

    def __init__(
        self,
        interval: int,
        callback: Callable[[list[Value]], Awaitable[None]],
    ) -> None:
        self.interval = interval  # milliseconds
        self.callback = callback
        self.cache: dict[str, list[Value]] = {}
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
            self._task = None
        await self.write()

    def buffer(self, values: list[Value]) -> None:
        for value in values:
            key = f"{value.device_id}-{value.measurement_id}"
            self.cache.setdefault(key, []).append(value)

    async def write(self) -> None:
        # Swap first so values buffered during the callback are not lost.
        cache, self.cache = self.cache, {}
        values: list[Value] = []

        for measurement_values in cache.values():
            first = measurement_values[0]
            count = len(measurement_values)
            average = round(sum(v.value for v in measurement_values) / count, first.decimals)
            time = round(sum(v.time for v in measurement_values) / count)
            values.append(
                Value(
                    first.device_id,
                    first.measurement_id,
                    int(average) if first.decimals == 0 else average,
                    first.decimals,
                    time,
                )
            )

        if values:
            await self.callback(values)

    async def _run(self) -> None:
        while True:
            await asyncio.sleep(self.interval / 1000)
            try:
                await self.write()
            except Exception:
                logger.exception("Failed to write WriteBuffer values.")
