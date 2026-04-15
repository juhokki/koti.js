export interface Alarm {
	assetId: string;
	assetName: string;
	deviceId: string;
	deviceName: string;
	measurementId: string;
	measurementName: string;
	name: string;
	time: number;
	type: AlarmType;
}

export enum AlarmType {
	Stale = "stale",
	ValueUpperLimit = "value.upper-limit",
	ValueLowerLimit = "value.lower-limit"
}
