import AssetView from "./AssetView";
import DeviceHistory from "./device/DeviceHistory";
import DeviceAlarms from "./device/DeviceAlarms";
import DeviceSchedules from "./device/DeviceSchedules";
import DeviceActions from "./device/DeviceActions";
import DeviceActionScript from "./device/DeviceActionScript";
import useAssetPath from "../../hooks/useAssetPath";

export default function AssetRoute() {
	const { asset, deviceId, section } = useAssetPath();

	if (!asset) {
		return null;
	}

	if (!deviceId) {
		return <AssetView />;
	}

	switch (section) {
		case "history":
			return <DeviceHistory />;
		case "alarms":
			return <DeviceAlarms />;
		case "schedules":
			return <DeviceSchedules />;
		case "actions":
			return <DeviceActions />;
		case "script":
			return <DeviceActionScript />;
		default:
			return null;
	}
}
