import cron, { type ScheduledTask } from "node-cron";
import type Schedule from "./Schedule.ts";
import type { CronScheduleOptions } from "../../asset/ScheduleConfig.ts";

export default class CronSchedule implements Schedule {
	options: CronScheduleOptions;
	task: ScheduledTask | undefined;

	constructor(options: CronScheduleOptions) {
		this.options = options;
	}

	start(run: () => void) {
		this.task = cron.schedule(this.options.expression, run);
	}

	async stop() {
		await this.task?.stop();
	}
}
