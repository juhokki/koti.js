import AlarmCheckerBase from "./AlarmCheckerBase.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import type AlarmCheckerOptions from "./AlarmCheckerOptions.ts";
import type Value from "../../../model/Value.ts";
import type Measurement from "../../../model/Measurement.ts";

export default class StaleValueAlarmChecker extends AlarmCheckerBase {
	timeouts: Map<string, NodeJS.Timeout>;

	constructor(services: ServiceLocator, options: AlarmCheckerOptions) {
		super(services, options);

		this.timeouts = new Map();
	}

	override stop() {
		super.stop();

		this.timeouts.forEach((timeoutId) => {
			clearTimeout(timeoutId);
		});

		this.timeouts.clear();
	}

	override check(measurement: Measurement, value: Value) {
		const now = Date.now();
		const elapsed = now - value.time;
		const limit = this.getConfigAttribute<number>(measurement, "limit");

		if (elapsed > limit) {
			// Limit has already passed, trigger alarm now.
			this.trigger(measurement, value.time);
		} else {
			// Clear existing alarm (if any).
			const key = this.getUniqueMeasurementKey(measurement);
			this.clear(key);

			// Calculate time remaining to limit and queue.
			const left = limit - elapsed;
			this.queue(measurement, left);
		}
	}

	queue(measurement: Measurement, time: number) {
		const key = this.getUniqueMeasurementKey(measurement);

		this.timeouts.set(
			key,
			setTimeout(() => {
				this.trigger(measurement, Date.now());
				this.timeouts.delete(key);
			}, time)
		);
	}

	override clear(key: string) {
		super.clear(key);

		if (this.timeouts.has(key)) {
			clearTimeout(this.timeouts.get(key));
			this.timeouts.delete(key);
		}
	}

	getTimeouts() {
		return Array.from(this.timeouts.values());
	}
}
