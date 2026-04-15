import type Value from "../../../model/Value.js";

export default interface Database {
	start(): Promise<void>;
	stop(): Promise<void>;
	readLatestValues(): Promise<Value[]>;
	readValueRange(
		deviceId: string,
		startTime: number,
		endTime: number
	): Promise<Value[]>;
	write(values: Value[]): Promise<void>;
}
