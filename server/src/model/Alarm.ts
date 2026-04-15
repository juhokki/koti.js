import type AlarmType from "../enums/AlarmType.js";

export default class Alarm {
	assetId: string;
	assetName: string;
	deviceId: string;
	deviceName: string;
	measurementId: string;
	measurementName: string;
	name: string;
	time: number;
	type: AlarmType;

	constructor(
		assetId: string,
		assetName: string,
		deviceId: string,
		deviceName: string,
		measurementId: string,
		measurementName: string,
		name: string,
		time: number,
		type: AlarmType
	) {
		this.assetId = assetId;
		this.assetName = assetName;
		this.deviceId = deviceId;
		this.deviceName = deviceName;
		this.measurementId = measurementId;
		this.measurementName = measurementName;
		this.name = name;
		this.time = time;
		this.type = type;
	}
}
