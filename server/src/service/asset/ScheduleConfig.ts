import type ValueType from "../../types/ValueType.ts";
import type ScheduleType from "../../constants/ScheduleType.ts";
import type { SunTimeName } from "suncalc";

export type SuncalcProperty = SunTimeName | "solarNoon" | "nadir";

export interface CronScheduleOptions {
	expression: string;
}

export interface SuncalcScheduleOptions {
	lat: number;
	lng: number;
	property: SuncalcProperty;
}

export default class ScheduleConfig {
	name: string;
	type: ScheduleType;
	options: CronScheduleOptions | SuncalcScheduleOptions;
	value: ValueType;

	constructor(
		name: string,
		type: ScheduleType,
		options: CronScheduleOptions | SuncalcScheduleOptions,
		value: ValueType
	) {
		this.name = name;
		this.type = type;
		this.options = options;
		this.value = value;
	}
}
