import type DeviceOnlineStatus from "../../enums/DeviceOnlineStatus.js";
import type DeviceType from "../../enums/DeviceType.js";
import type MeasurementConfig from "./MeasurementConfig.js";

export default interface DeviceConfig {
	id: string;
	type: DeviceType;
	name: string;
	icon: string;
	measurements: MeasurementConfig[];
	onlineStatus: DeviceOnlineStatus;
}
