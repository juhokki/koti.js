# Koti.js

Koti.js is a home automation platform for monitoring sensors, controlling devices, and building practical automations around real household data.

It combines a Node.js backend, a React frontend, and multiple hardware bridges so Bluetooth, RF, and network-connected devices can be used through one interface.

## Features

- [Matter devices](server/src/service/integration/matter/MatterIntegration.ts)
- [OpenWeather integration](server/src/service/integration/openweather/OpenWeatherIntegration.ts)
- [REST API](server/src/service/integration/rest/RestApiIntegration.ts)
- RuuviTag sensors
- 433 MHz communication through [rtl433-doorbell-relay](rtl433-doorbell-relay/) and [sonoff-rf-bridge-r2](sonoff-rf-bridge-r2/)
- [Shelly devices](server/src/service/integration/shelly/ShellyIntegration.ts)
- [Toshiba heat pump integration](server/src/service/integration/toshiba/ToshibaAcIntegration.ts)
- A shopping list with real-time WebSocket updates

## What Koti.js Includes

| Component | Purpose | Link | 
| --- | --- | --- | 
| `server` | Backend API, integrations, scheduling, and data handling | [server/README.md](server/README.md) |
| `frontend` | Web UI for device state, controls, and monitoring | [frontend/README.md](frontend/README.md) |
| `ruuvi-sensor` | Bridge for RuuviTag Bluetooth sensor data | [ruuvi-sensor/README.md](ruuvi-sensor/README.md) |
| `rtl433-doorbell-relay` | Python relay that listens with `rtl_433` and posts doorbell events to the API | [rtl433-doorbell-relay/README.md](rtl433-doorbell-relay/README.md) | 
| `sonoff-rf-bridge-r2` | RF bridge setup for Sonoff RF Bridge R2 + ESPHome | [sonoff-rf-bridge-r2/README.md](sonoff-rf-bridge-r2/README.md) |

## Quick Start

1. Install dependencies:

```bash
cd server && npm install
cd ../frontend && npm install
```

2. Configure services:

- Copy `server/conf.templates/*` into `server/conf/` and fill in environment-specific values.
- Copy relay/sensor templates into local `conf/` folders where applicable.

3. Build source and start server:

```bash
cd frontend && npm run build
cd ..
cd server && npm run start
```

4. Add optional bridges on devices (Raspberry Pi or similar):

- `ruuvi-sensor`
- `rtl433-doorbell-relay`
- `sonoff-rf-bridge-r2`

## Project Structure

- `server/`: API and core automation logic
- `frontend/`: browser UI
- `ruuvi-sensor/`: Bluetooth sensor ingestion client
- `rtl433-doorbell-relay/`: 433 MHz doorbell event relay
- `sonoff-rf-bridge-r2/`: Sonoff RF Bridge configuration

## Additional Insights

- The project is intentionally modular: data producers (sensor/relay clients) can run independently and post events to the same API.
- Configuration templates are used across modules to keep deployment repeatable.
- Systemd service examples are documented in module READMEs for always-on device and server workloads.
