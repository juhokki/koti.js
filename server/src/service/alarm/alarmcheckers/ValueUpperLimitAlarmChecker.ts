import type Measurement from "../../../model/Measurement.js";
import type Value from "../../../model/Value.js";
import AlarmCheckerBase from "./AlarmCheckerBase.js";

export default class ValueUpperLimitAlarmChecker extends AlarmCheckerBase {
	override check(measurement: Measurement, value: Value) {
		const limit = this.getConfigAttribute<number>(measurement, "limit");

		if ((value.value as number) > limit) {
			this.trigger(measurement, value.time);
		} else {
			const key = this.getUniqueMeasurementKey(measurement);
			this.clear(key);
		}
	}
}
