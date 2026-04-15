# Sonoff RF Bridge R2

Sends RF 433Mhz messages to Koti using Sonoff RF Bridge R2 device flashed with ESPHome.

## Guide
```
https://www.irrgang.dev/how-to-flash-the-sonoff-rf-bridger2-with-esphome/
```

## Flash from Windows
```
docker run --rm --privileged -v "%cd%":/config -it ghcr.io/esphome/esphome run sonoff-rf-bridge.yaml
```

## secrets.yaml

Copy from secrets.yaml.template to secrets.yaml.