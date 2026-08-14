import ScheduleConfig from "../service/asset/ScheduleConfig.ts";
import MeasurementType from "../constants/MeasurementType.ts";
import type ActionConfig from "../service/asset/ActionConfig.ts";
import type AlarmConfig from "../service/asset/AlarmConfig.ts";

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
	actions: ActionConfig[];
	alarms: AlarmConfig[];
	schedules: ScheduleConfig[];
	disabled = false;

	constructor(
		deviceId: string,
		id: string,
		name: string,
		type: MeasurementType,
		unit: string,
		icon: string,
		controllable = false,
		min: number | undefined = undefined,
		max: number | undefined = undefined,
		actions: ActionConfig[] = [],
		alarms: AlarmConfig[] = [],
		schedules: ScheduleConfig[] = []
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
