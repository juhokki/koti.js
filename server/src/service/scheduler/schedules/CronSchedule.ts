import cron, { type ScheduledTask } from "node-cron";
import type Schedule from "./ScheduledTask.ts";
import type { CronScheduleOptions } from "../../../model/Schedule.ts";

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
