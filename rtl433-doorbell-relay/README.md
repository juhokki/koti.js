# RTL433 doorbell relay

This script listens for a custom doorbell signal with `rtl_433` and posts one event per ring to Koti.js.

## Configuration

Copy `conf.templates/settings.json` to `conf/settings.json` and fill in values.

```json
{
  "apiUrl": "Koti.js server API url",
  "username": "User",
  "password": "Password",
  "deviceId": "Configured device id in Koti.js",
  "measurementId": "Configured measurement id in Koti.js",
  "eventValue": 1,
  "requiredCodes": "Expected code to be included in the message. (TODO: Decoder should probably be defined more strictly to avoid false triggers after which this could be removed.)",
  "RTL433_FREQUENCY": "rtl_433 scan frequency",
  "RTL433_DECODER": "rtl_433 flex decoder value",
  "cooldownSeconds": "Wait before API call can be triggered again",
  "requestTimeoutSeconds": "Timeout for API call",
  "restartDelaySeconds": "Delay before restarting service after crash"
}
```

## Requirements

- Python 3.10+
- `rtl_433` installed and available in `PATH`
- RTL-SDR device connected to the host

## Run

```bash
python3 relay.py
```

Optional config path:

```bash
python3 relay.py --config ./conf/settings.json
```

The script starts `rtl_433` using `RTL433_FREQUENCY` and `RTL433_DECODER` from the config.

Default decoder:

```text
name=Doorbell,modulation=OOK_PWM,short=387,long=782,reset=9000
```

and sends this payload shape to Koti when it sees a matching event:

```json
[
  {
    "deviceId": "ovikello",
    "measurementId": "ring",
    "value": 1,
    "time": 1723243200000
  }
]
```

## Manual rtl_433 test

Use this to confirm the receiver and decoder work before starting the relay service:

```bash
rtl_433 -f 433.92M -X 'name=Doorbell,modulation=OOK_PWM,short=387,long=782,reset=9000' -F json
```

The relay only accepts events where `model` is `Doorbell` and `codes` contains one of the values in `requiredCodes`.

When a doorbell event is received, the relay suppresses duplicate decoder hits for a short cooldown window so one press only generates one REST event.

## systemd service

```ini
[Unit]
Description=RTL433 doorbell relay
After=network.target

[Service]
WorkingDirectory=/home/koti/koti.js/rtl433-doorbell-relay
ExecStart=python3 relay.py
Restart=on-failure
User=koti

[Install]
WantedBy=multi-user.target
```

Then reload and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rtl433-doorbell-relay.service
sudo systemctl start rtl433-doorbell-relay.service
```

## Example Koti.js device config

```json
{
	"id": "ovikello",
	"name": "Ovikello",
	"type": "RestApiIntegration",
	"icon": "doorbell",
	"measurements": [
		{
			"id": "ring",
			"name": "Soittokerrat",
			"type": "counter",
			"unit": "",
			"icon": "plus_one",
			"actions": [
				{
					"name": "Lähetä ilmoitus kun ovikello soi",
					"trigger": "onChange",
					"script": "this.sendPushNotification(\"Ovikello\", \"Ovikello soi!\");"
				}
			]
		}
	]
}
```