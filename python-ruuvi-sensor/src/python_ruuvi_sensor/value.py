from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Value:
    device_id: str
    measurement_id: str
    value: float
    decimals: int
    time: int  # epoch milliseconds

    def to_dict(self) -> dict[str, Any]:
        # Key names match the server API.
        return {
            "deviceId": self.device_id,
            "measurementId": self.measurement_id,
            "value": self.value,
            "decimals": self.decimals,
            "time": self.time,
        }
