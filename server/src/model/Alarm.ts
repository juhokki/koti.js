import type AlarmType from "../constants/AlarmType.ts";

export default class Alarm {
	name: string;
	type: AlarmType;
	limit: number;

	constructor(name: string, type: AlarmType, limit: number) {
		this.name = name;
		this.type = type;
		this.limit = limit;
	}
}
