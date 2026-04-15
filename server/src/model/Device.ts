import Measurement from "./Measurement.js";
import DeviceOnlineStatus from "../enums/DeviceOnlineStatus.js";
import DeviceType from "../enums/DeviceType.js";

export default class Device {
	id: string;
	type: DeviceType;
	name: string;
	icon: string;
	measurements: Measurement[];
	onlineStatus: DeviceOnlineStatus = DeviceOnlineStatus.UNKNOWN;

	constructor(
		id: string,
		type: DeviceType,
		name: string,
		icon: string,
		measurements: Measurement[] = []
	) {
		this.id = id;
		this.type = type;
		this.name = name;
		this.icon = icon;
		this.measurements = measurements;
	}

	getOnlineStatus() {
		return this.onlineStatus;
	}

	setOnlineStatus(onlineStatus: DeviceOnlineStatus) {
		this.onlineStatus = onlineStatus;
	}
}
