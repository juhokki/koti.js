#!/usr/bin/env python3

import argparse
import base64
import json
import logging
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import error, request


DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent / "conf" / "settings.json"


@dataclass(frozen=True)
class RelayConfig:
	api_url: str
	username: str
	password: str
	device_id: str
	measurement_id: str
	event_value: int | float | bool | str
	required_codes: tuple[str, ...]
	rtl433_frequency: str
	rtl433_decoder: str
	cooldown_seconds: float
	request_timeout_seconds: float
	restart_delay_seconds: float


class DoorbellRelay:
	def __init__(self, config: RelayConfig) -> None:
		self._config = config
		self._should_stop = False
		self._last_trigger_monotonic = 0.0

	def stop(self, *_args: Any) -> None:
		self._should_stop = True
		logging.info("Shutdown requested")

	def run(self) -> int:
		while not self._should_stop:
			process = self._start_rtl433()
			try:
				self._consume_events(process)
			finally:
				self._terminate_process(process)

			if self._should_stop:
				break

			logging.warning(
				"rtl_433 exited unexpectedly; restarting in %.1f seconds",
				self._config.restart_delay_seconds,
			)
			time.sleep(self._config.restart_delay_seconds)

		return 0

	def _start_rtl433(self) -> subprocess.Popen[str]:
		command = [
			"rtl_433",
			"-f",
			self._config.rtl433_frequency,
			"-R",
			"0",
			"-X",
			self._config.rtl433_decoder,
			"-F",
			"json",
		]
		logging.info("Starting rtl_433 listener")
		logging.debug("Command: %s", " ".join(command))

		try:
			return subprocess.Popen(
				command,
				stdout=subprocess.PIPE,
				stderr=subprocess.STDOUT,
				text=True,
				bufsize=1,
			)
		except FileNotFoundError as exc:
			raise RuntimeError("rtl_433 executable was not found in PATH") from exc

	def _consume_events(self, process: subprocess.Popen[str]) -> None:
		if process.stdout is None:
			raise RuntimeError("rtl_433 stdout pipe was not created")

		for raw_line in process.stdout:
			if self._should_stop:
				return

			line = raw_line.strip()
			if not line:
				continue

			event = parse_rtl433_json(line)
			if event is None:
				logging.debug("rtl_433: %s", line)
				continue

			if not is_doorbell_event(event, self._config.required_codes):
				logging.debug("Ignoring non-doorbell event: %s", event)
				continue

			if self._is_duplicate_event():
				logging.debug("Suppressed duplicate doorbell event")
				continue

			logging.info("Doorbell ring event detected")
			self._post_ring_event()

		return_code = process.poll()
		if return_code not in (None, 0):
			logging.error("rtl_433 exited with return code %s", return_code)

	def _is_duplicate_event(self) -> bool:
		now = time.monotonic()
		elapsed = now - self._last_trigger_monotonic
		if elapsed < self._config.cooldown_seconds:
			return True

		self._last_trigger_monotonic = now
		return False

	def _post_ring_event(self) -> None:
		payload = [
			{
				"deviceId": self._config.device_id,
				"measurementId": self._config.measurement_id,
				"value": self._config.event_value,
				"time": int(time.time() * 1000),
			}
		]
		body = json.dumps(payload).encode("utf-8")
		auth_token = base64.b64encode(
			f"{self._config.username}:{self._config.password}".encode("utf-8")
		).decode("ascii")
		http_request = request.Request(
			self._config.api_url,
			data=body,
			headers={
				"Authorization": f"Basic {auth_token}",
				"Content-Type": "application/json",
			},
			method="POST",
		)

		try:
			with request.urlopen(
				http_request,
				timeout=self._config.request_timeout_seconds,
			) as response:
				logging.info(
					"Posted doorbell ring event with status %s",
					response.status,
				)
		except error.HTTPError as exc:
			logging.error(
				"Doorbell event POST failed with status %s: %s",
				exc.code,
				exc.read().decode("utf-8", errors="replace"),
			)
		except error.URLError as exc:
			logging.error("Doorbell event POST failed: %s", exc)

	@staticmethod
	def _terminate_process(process: subprocess.Popen[str]) -> None:
		if process.poll() is not None:
			return

		process.terminate()
		try:
			process.wait(timeout=5)
		except subprocess.TimeoutExpired:
			process.kill()
			process.wait(timeout=5)


def parse_rtl433_json(line: str) -> dict[str, Any] | None:
	try:
		event = json.loads(line)
	except json.JSONDecodeError:
		return None

	return event if isinstance(event, dict) else None


def is_doorbell_event(event: dict[str, Any], required_codes: tuple[str, ...]) -> bool:
	model = event.get("model")
	if model != "Doorbell":
		return False

	codes = event.get("codes")
	if not isinstance(codes, list):
		return False

	string_codes = {value for value in codes if isinstance(value, str)}
	if not string_codes:
		return False

	return any(code in string_codes for code in required_codes)


def load_config(path: Path) -> RelayConfig:
	try:
		raw_config = json.loads(path.read_text(encoding="utf-8"))
	except FileNotFoundError as exc:
		raise RuntimeError(f"Config file not found: {path}") from exc
	except json.JSONDecodeError as exc:
		raise RuntimeError(f"Invalid JSON in config file: {path}") from exc

	if not isinstance(raw_config, dict):
		raise RuntimeError("Config file root must be a JSON object")

	username = get_required_string(raw_config, "username")
	password = get_required_string(raw_config, "password")

	return RelayConfig(
		api_url=get_required_string(raw_config, "apiUrl"),
		username=username,
		password=password,
		device_id=get_required_string(raw_config, "deviceId"),
		measurement_id=get_required_string(raw_config, "measurementId"),
		event_value=get_required_event_value(raw_config, "eventValue"),
		required_codes=get_required_string_tuple(raw_config, "requiredCodes"),
		rtl433_frequency=get_required_string(raw_config, "RTL433_FREQUENCY"),
		rtl433_decoder=get_required_string(raw_config, "RTL433_DECODER"),
		cooldown_seconds=get_required_positive_float(raw_config, "cooldownSeconds"),
		request_timeout_seconds=get_required_positive_float(
			raw_config,
			"requestTimeoutSeconds",
		),
		restart_delay_seconds=get_required_positive_float(
			raw_config,
			"restartDelaySeconds",
		),
	)


def get_required_string(raw_config: dict[str, Any], key: str) -> str:
	value = raw_config.get(key)
	if not isinstance(value, str) or not value.strip():
		raise RuntimeError(f"Config field '{key}' must be a non-empty string")

	return value


def get_required_positive_float(raw_config: dict[str, Any], key: str) -> float:
	value = raw_config.get(key)
	if not isinstance(value, (int, float)):
		raise RuntimeError(f"Config field '{key}' must be numeric")
	if value <= 0:
		raise RuntimeError(f"Config field '{key}' must be greater than zero")

	return float(value)


def get_required_event_value(raw_config: dict[str, Any], key: str) -> int | float | bool | str:
	if key not in raw_config:
		raise RuntimeError(f"Config field '{key}' is required")

	value = raw_config[key]
	if not isinstance(value, (int, float, bool, str)):
		raise RuntimeError(
			f"Config field '{key}' must be a number, boolean, or string"
		)

	return value


def get_required_string_tuple(raw_config: dict[str, Any], key: str) -> tuple[str, ...]:
	value = raw_config.get(key)
	if not isinstance(value, list):
		raise RuntimeError(f"Config field '{key}' must be a string array")

	values: list[str] = []
	for item in value:
		if not isinstance(item, str) or not item.strip():
			raise RuntimeError(
				f"Config field '{key}' must only contain non-empty strings"
			)
		values.append(item)

	if not values:
		raise RuntimeError(f"Config field '{key}' must contain at least one code")

	return tuple(values)


def configure_logging() -> None:
	logging.basicConfig(
		level=logging.INFO,
		format="%(asctime)s %(levelname)s %(message)s",
	)


def parse_args(argv: list[str]) -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Listen for doorbell events with rtl_433 and relay them to Koti",
	)
	parser.add_argument(
		"--config",
		type=Path,
		default=DEFAULT_CONFIG_PATH,
		help=f"Path to relay config JSON (default: {DEFAULT_CONFIG_PATH})",
	)
	return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
	configure_logging()
	args = parse_args(argv or sys.argv[1:])
	config = load_config(args.config)
	relay = DoorbellRelay(config)

	signal.signal(signal.SIGINT, relay.stop)
	signal.signal(signal.SIGTERM, relay.stop)

	try:
		return relay.run()
	except RuntimeError as exc:
		logging.error("%s", exc)
		return 1


if __name__ == "__main__":
	raise SystemExit(main())
