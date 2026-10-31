import AssetDetails from "./AssetDetails";
import DeviceHistory from "./device/DeviceHistory";
import DeviceAlarms from "./device/DeviceAlarms";
import DeviceSchedules from "./device/DeviceSchedules";
import DeviceActions from "./device/DeviceActions";
import useAssetPath from "../../hooks/useAssetPath";

export default function AssetRoute() {
	const { asset, deviceId, section } = useAssetPath();

	if (!asset) {
		return null;
	}

	if (!deviceId) {
		return <AssetDetails />;
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
		default:
			return null;
	}
}
