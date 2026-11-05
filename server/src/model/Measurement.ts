import Schedule from "./Schedule.ts";
import MeasurementType from "../constants/MeasurementType.ts";
import type Action from "./Action.ts";
import type Alarm from "./Alarm.ts";

export default class Measurement {
	deviceId: string;
	id: string;
	name: string;
	type: MeasurementType;
	unit: string;
	icon: string;
	controllable: boolean;
	min: number | undefined;
	max: number | undefined;
	steps: number[] | undefined;
	actions: Action[];
	alarms: Alarm[];
	schedules: Schedule[];
	disabled = false;

	constructor(
		deviceId: string,
		id: string,
		name: string,
		type: MeasurementType,
		unit: string,
		icon: string,
		controllable = false,
		min?: number,
		max?: number,
		actions: Action[] = [],
		alarms: Alarm[] = [],
		schedules: Schedule[] = [],
		steps?: number[]
	) {
		this.deviceId = deviceId;
		this.id = id;
		this.name = name;
		this.type = type;
		this.unit = unit;
		this.icon = icon;
		this.controllable = controllable;
		this.min = min;
		this.max = max;
		this.steps = steps;
		this.actions = actions;
		this.alarms = alarms;
		this.schedules = schedules;
	}

	getDisabled(): boolean {
		return this.disabled;
	}

	setDisabled(disabled: boolean) {
		this.disabled = disabled;
	}
}
