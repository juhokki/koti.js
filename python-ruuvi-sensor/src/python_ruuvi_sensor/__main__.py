import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

from .ruuvi_sensor import RuuviSensor


async def run(settings_file: Path) -> None:
    sensor = RuuviSensor(settings_file)
    stop_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            # Windows event loops do not support add_signal_handler.
            signal.signal(sig, lambda *_: loop.call_soon_threadsafe(stop_event.set))

    await sensor.start()
    try:
        await stop_event.wait()
    finally:
        await sensor.stop()


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    settings_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("conf", "settings.json")
    asyncio.run(run(settings_file))


if __name__ == "__main__":
    main()
