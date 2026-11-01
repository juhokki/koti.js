import type AlarmType from "../constants/AlarmType.ts";

export default class Alarm {
	deviceId: string;
	deviceName: string;
	measurementId: string;
	measurementName: string;
	name: string;
	time: number;
	type: AlarmType;

	constructor(
		deviceId: string,
		deviceName: string,
		measurementId: string,
		measurementName: string,
		name: string,
		time: number,
		type: AlarmType
	) {
		this.deviceId = deviceId;
		this.deviceName = deviceName;
		this.measurementId = measurementId;
		this.measurementName = measurementName;
		this.name = name;
		this.time = time;
		this.type = type;
	}
}
