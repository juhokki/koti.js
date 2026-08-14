import type Measurement from "../../../model/Measurement.ts";
import type Value from "../../../model/Value.ts";
import AlarmCheckerBase from "./AlarmCheckerBase.ts";

export default class ValueLowerLimitAlarmChecker extends AlarmCheckerBase {
	override check(measurement: Measurement, value: Value) {
		const limit = this.getConfigAttribute<number>(measurement, "limit");

		if ((value.value as number) < limit) {
			this.trigger(measurement, value.time);
		} else {
			const key = this.getUniqueMeasurementKey(measurement);
			this.clear(key);
		}
	}
}
