# Ruuvi sensor

See also:

- [Project overview](../README.md)

## Configuration

- Copy from conf.templates to conf.

## Install

- create user koti
- git checkout koti
- cd ruuvi-sensor
- npm install
- npm run start
- create systemd service file

## systemd service file
```
sudo nano /etc/systemd/system/ruuvi-sensor.service
```
```
[Unit]
Description=Ruuvi sensor
After=network.target

[Service]
WorkingDirectory=/home/koti/koti.js/ruuvi-sensor
ExecStart=npm run start
Restart=on-failure
User=koti

[Install]
WantedBy=multi-user.target
```
```
sudo systemctl daemon-reload
sudo systemctl enable ruuvi-sensor.service
sudo systemctl start ruuvi-sensor.service
```