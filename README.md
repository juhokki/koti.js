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
- A shopping list with real-time WebSocket updates.

## Quick Start

1. Install dependencies:

```bash
cd server && npm install
cd ../frontend && npm install
```

2. Configure server:

- Copy `server/conf.templates/*` into `server/conf/` and fill in environment-specific values.

3. Build frontend and start server:

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
