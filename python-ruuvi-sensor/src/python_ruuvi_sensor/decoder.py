import logging
import struct

logger = logging.getLogger(__name__)

RUUVI_MANUFACTURER_ID = 0x0499

# (measurement id, value, decimals)
Measurement = tuple[str, float, int]


def _round(value: float, decimals: int) -> float:
    rounded = round(value, decimals)
    return int(rounded) if decimals == 0 else rounded


def decode(data: bytes) -> list[Measurement]:
    """Decode Ruuvi manufacturer data payload (without the company id)."""
    if not data:
        return []

    data_format = data[0]

    match data_format:
        case 3:
            return _decode_format_3(data)
        case 5:
            return _decode_format_5(data)
        case 6:
            return _decode_format_6(data)
        case _:
            logger.warning("Unrecognized data format %d. Skipping value.", data_format)
            return []


def _decode_format_3(data: bytes) -> list[Measurement]:
    if len(data) < 14:
        logger.warning("Data format 3 payload too short.")
        return []

    humidity = data[1] * 0.5
    temp_whole = data[2] & 0x7F
    temperature = temp_whole + data[3] / 100
    if data[2] & 0x80:
        temperature = -temperature
    (pressure,) = struct.unpack_from(">H", data, 4)
    (battery,) = struct.unpack_from(">H", data, 12)

    return [
        ("temperature", _round(temperature, 1), 1),
        ("humidity", _round(humidity, 1), 1),
        ("pressure", _round((pressure + 50000) * 0.001, 3), 3),
        ("battery", _round(battery * 0.001, 2), 2),
    ]


def _decode_format_5(data: bytes) -> list[Measurement]:
    if len(data) < 15:
        logger.warning("Data format 5 payload too short.")
        return []

    temperature, humidity, pressure = struct.unpack_from(">hHH", data, 1)
    (power,) = struct.unpack_from(">H", data, 13)
    battery_raw = power >> 5

    measurements: list[Measurement] = []
    if temperature != -0x8000:
        measurements.append(("temperature", _round(temperature * 0.005, 1), 1))
    if humidity != 0xFFFF:
        measurements.append(("humidity", _round(humidity * 0.0025, 1), 1))
    if pressure != 0xFFFF:
        measurements.append(("pressure", _round((pressure + 50000) * 0.001, 3), 3))
    if battery_raw != 0x7FF:
        measurements.append(("battery", _round((battery_raw + 1600) * 0.001, 2), 2))
    return measurements


def _decode_format_6(data: bytes) -> list[Measurement]:
    if len(data) < 17:
        logger.warning("Data format 6 payload too short.")
        return []

    temperature, humidity, pressure, pm25, co2 = struct.unpack_from(">hHHHH", data, 1)
    flags = data[16]
    voc = (data[11] << 1) | ((flags >> 6) & 1)
    nox = (data[12] << 1) | ((flags >> 7) & 1)

    measurements: list[Measurement] = []
    if temperature != -0x8000:
        measurements.append(("temperature", _round(temperature * 0.005, 1), 1))
    if humidity != 0xFFFF:
        measurements.append(("humidity", _round(humidity * 0.0025, 1), 1))
    if pressure != 0xFFFF:
        measurements.append(("pressure", _round((pressure + 50000) * 0.001, 3), 3))
    if pm25 != 0xFFFF:
        measurements.append(("pm25", _round(pm25 * 0.1, 1), 1))
    if co2 != 0xFFFF:
        measurements.append(("co2", co2, 0))
    if voc != 0x1FF:
        measurements.append(("voc", voc, 0))
    if nox != 0x1FF:
        measurements.append(("nox", nox, 0))
    return measurements
