# Python Ruuvi sensor

Python port of [ruuvi-sensor](../ruuvi-sensor/README.md). Reads Ruuvi tag BLE advertisements with [bleak](https://github.com/hbldh/bleak) and sends the values to the server. Supports data formats 3, 5 and 6.

See also:

- [Project overview](../README.md)

## Configuration

- Copy from conf.templates to conf.
- Optionally pass a settings file path as the first argument.
- Log level is set with the `LOG_LEVEL` environment variable (default `INFO`).

## Install

Requires Python 3.12+.

```
cd python-ruuvi-sensor
python3 -m venv .venv
.venv/bin/pip install .
.venv/bin/ruuvi-sensor
```

## systemd service file

```
sudo nano /etc/systemd/system/python-ruuvi-sensor.service
```

```
[Unit]
Description=Python Ruuvi sensor
After=network.target bluetooth.target

[Service]
WorkingDirectory=/home/koti/koti.js/python-ruuvi-sensor
ExecStart=/home/koti/koti.js/python-ruuvi-sensor/.venv/bin/ruuvi-sensor
Restart=on-failure
User=koti

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload
sudo systemctl enable python-ruuvi-sensor.service
sudo systemctl start python-ruuvi-sensor.service
```
