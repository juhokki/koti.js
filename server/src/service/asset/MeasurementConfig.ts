import type MeasurementType from "../../constants/MeasurementType.ts";
import type Action from "../../model/Action.ts";
import type Alarm from "../../model/Alarm.ts";
import type Schedule from "../../model/Schedule.ts";

export default interface MeasurementConfig {
	id: string;
	name: string;
	type: MeasurementType;
	unit: string;
	icon: string;
	controllable?: boolean;
	min?: number;
	max?: number;
	steps?: number[];
	actions?: Action[];
	alarms?: Alarm[];
	schedules?: Schedule[];
}
