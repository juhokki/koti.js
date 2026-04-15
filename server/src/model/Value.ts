import type ValueType from "../types/ValueType.js";

export default class Value {
	deviceId: string;
	measurementId: string;
	value: ValueType;
	time: number;

	constructor(
		deviceId: string,
		measurementId: string,
		value: ValueType,
		time = Date.now()
	) {
		this.deviceId = deviceId;
		this.measurementId = measurementId;
		this.value = value;
		this.time = time;
	}
}
