import type ValueType from "../../types/ValueType.ts";

export default class ScheduleConfig {
	name: string;
	cron: string;
	value: ValueType;

	constructor(name: string, cron: string, value: ValueType) {
		this.name = name;
		this.cron = cron;
		this.value = value;
	}
}
