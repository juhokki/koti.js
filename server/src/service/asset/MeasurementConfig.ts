import type MeasurementType from "../../constants/MeasurementType.ts";
import type ActionConfig from "./ActionConfig.ts";
import type AlarmConfig from "./AlarmConfig.ts";
import type ScheduleConfig from "./ScheduleConfig.ts";

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
