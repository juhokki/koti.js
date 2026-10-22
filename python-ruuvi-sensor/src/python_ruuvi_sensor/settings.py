import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ApiSettings:
    username: str
    password: str


@dataclass(frozen=True)
class WriteBufferSettings:
    enabled: bool
    interval: int  # milliseconds


@dataclass(frozen=True)
class Settings:
    url: str
    api: ApiSettings
    write_buffer: WriteBufferSettings


def load_settings(path: Path) -> Settings:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)

    return Settings(
        url=data["url"],
        api=ApiSettings(
            username=data["api"]["username"],
            password=data["api"]["password"],
        ),
        write_buffer=WriteBufferSettings(
            enabled=data["writeBuffer"]["enabled"],
            interval=data["writeBuffer"]["interval"],
        ),
    )
