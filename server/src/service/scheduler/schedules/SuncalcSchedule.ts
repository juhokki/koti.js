import { getTimes } from "suncalc";
import type Schedule from "./Schedule.ts";
import type { SuncalcScheduleOptions } from "../../asset/ScheduleConfig.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

export default class SuncalcSchedule implements Schedule {
	options: SuncalcScheduleOptions;
	timer: NodeJS.Timeout | undefined;
	stopped = false;

	constructor(options: SuncalcScheduleOptions) {
		this.options = options;
	}

	start(run: () => void) {
		this.stopped = false;
		this.arm(run);
	}

	stop() {
		this.stopped = true;
		clearTimeout(this.timer);
	}

	arm(run: () => void) {
		if (this.stopped) {
			return;
		}

		const now = Date.now();
		const next = this.getNextTime(now);

		// No event in the next days (polar regions); check again tomorrow.
		if (next === undefined) {
			this.timer = setTimeout(() => {
				this.arm(run);
			}, DAY_MS);
			return;
		}

		this.timer = setTimeout(() => {
			run();
			this.arm(run);
		}, next - now);
	}

	getNextTime(now: number): number | undefined {
		for (let i = 0; i <= 2; i++) {
			const time = getTimes(
				new Date(now + i * DAY_MS),
				this.options.lat,
				this.options.lng
			)[this.options.property];

			if (time instanceof Date && time.getTime() > now) {
				return time.getTime();
			}
		}

		return undefined;
	}
}
