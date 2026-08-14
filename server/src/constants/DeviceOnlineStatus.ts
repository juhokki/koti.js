const DeviceOnlineStatus = {
	"ONLINE": "online",
	"OFFLINE": "offline",
	"UNKNOWN": "unknown"
} as const;

type DeviceOnlineStatus = (typeof DeviceOnlineStatus)[keyof typeof DeviceOnlineStatus];

export default DeviceOnlineStatus;
