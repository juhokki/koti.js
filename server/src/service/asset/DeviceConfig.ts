import type DeviceOnlineStatus from "../../constants/DeviceOnlineStatus.ts";
import type DeviceType from "../../constants/DeviceType.ts";
import type MeasurementConfig from "./MeasurementConfig.ts";

export default interface DeviceConfig {
	id: string;
	type: DeviceType;
	name: string;
	icon: string;
	measurements: MeasurementConfig[];
	onlineStatus: DeviceOnlineStatus;
}
