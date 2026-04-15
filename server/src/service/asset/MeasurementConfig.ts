import type MeasurementType from "../../enums/MeasurementType.js";
import type ActionConfig from "./ActionConfig.js";
import type AlarmConfig from "./AlarmConfig.js";
import type ScheduleConfig from "./ScheduleConfig.js";

export default interface MeasurementConfig {
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
	disabled: boolean;
}
