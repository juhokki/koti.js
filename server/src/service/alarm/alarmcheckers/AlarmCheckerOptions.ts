import type AlarmType from "../../../constants/AlarmType.ts";
import type TriggeredAlarm from "../../../model/TriggeredAlarm.ts";
import type Measurement from "../../../model/Measurement.ts";

export default interface AlarmCheckerOptions {
	type: AlarmType;
	measurements: Measurement[];
	onChange: (alarm: TriggeredAlarm | null, alarms: TriggeredAlarm[]) => void;
}
