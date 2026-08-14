import type AlarmType from "../../../constants/AlarmType.ts";
import type Alarm from "../../../model/Alarm.ts";
import type Measurement from "../../../model/Measurement.ts";

export default interface AlarmCheckerOptions {
	type: AlarmType;
	measurements: Measurement[];
	onChange: (alarms: Alarm[]) => void;
}
