export interface Value {
	deviceId: string;
	measurementId: string;
	value: ValueType;
	time: number;
}

export type ValueType = string | boolean | number;
