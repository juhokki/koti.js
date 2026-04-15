import type AlarmType from "../../enums/AlarmType.js";

export default class AlarmConfig {
	name: string;
	type: AlarmType;
	limit: number;

	constructor(name: string, type: AlarmType, limit: number) {
		this.name = name;
		this.type = type;
		this.limit = limit;
	}
}
