# Koti server

Server for Koti.

# Scripts

| Script | Description |
| ------ | ----------- |
| npm run start | Starts the Koti server |
| npm run build | Builds a dist folder |
| npm run test | Runs units tests |
| npm run test:coverage | Reports test coverage |
| npm run lint | Finds problems in code according to rules in eslint.config.js |
| npm run prettier | Formats code according to rules in .prettierrc.js |

## Systemd service setup

```
sudo nano /etc/systemd/system/koti.service
```

```
[Unit]
Description=Koti Server
After=postgresql.service

[Service]
WorkingDirectory=/home/koti/koti.js/server
ExecStart=node index.js
Restart=on-failure
User=koti

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload
sudo systemctl enable koti.service
sudo systemctl start koti.service
```
