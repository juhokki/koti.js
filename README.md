# Koti

Koti is a home automation platform for monitoring sensors, controlling devices, and building practical automations around real household data.

It combines a TypeScript backend, a React frontend, and multiple hardware bridges so Bluetooth, RF, and network-connected devices can be used through one interface.

## What Koti Includes

| Component | Purpose |
| --- | --- |
| `server` | Backend API, integrations, scheduling, and data handling |
| `frontend` | Web UI for device state, controls, and monitoring |
| `ruuvi-sensor` | Bridge for RuuviTag Bluetooth sensor data |
| `rtl433-doorbell-relay` | Python relay that listens with `rtl_433` and posts doorbell events to the API |
| `sonoff-rf-bridge-r2` | RF bridge setup for Sonoff RF Bridge R2 + ESPHome |

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
cd server && npm run build && npm run start
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

## Development Workflow

Common scripts in `server/` and `frontend/`:

- `npm run start`
- `npm run build`
- `npm run test`
- `npm run test:coverage`
- `npm run lint`
- `npm run prettier`

## Additional Insights

- The project is intentionally modular: data producers (sensor/relay clients) can run independently and post events to the same API.
- Configuration templates are used across modules to keep deployment repeatable.
- Systemd service examples are documented in module READMEs for always-on device and server workloads.

## Server

Koti backend API and automation services.

See: [server/README.md](server/README.md)

## Frontend

Koti web interface.

See: [frontend/README.md](frontend/README.md)

## Ruuvi-sensor

Application to run on a Bluetooth capable device (e.g. Raspberry PI) that captures messages from Ruuvi tags and forwards them to the Koti server.

See: [ruuvi-sensor/README.md](ruuvi-sensor/README.md)

## RTL433-doorbell-relay

Python relay that listens for 433 MHz doorbell events with `rtl_433` and posts matching triggers to Koti API.

See: [rtl433-doorbell-relay/README.md](rtl433-doorbell-relay/README.md)

## Sonoff-rf-bridge-r2

RF to Koti bridge.

See: [sonoff-rf-bridge-r2/README.md](sonoff-rf-bridge-r2/README.md)
