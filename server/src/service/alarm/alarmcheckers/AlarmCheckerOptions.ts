import type AlarmType from "../../../enums/AlarmType.js";
import type Alarm from "../../../model/Alarm.js";
import type Measurement from "../../../model/Measurement.js";

export default interface AlarmCheckerOptions {
	type: AlarmType;
	measurements: Measurement[];
	onChange: (alarms: Alarm[]) => void;
}
