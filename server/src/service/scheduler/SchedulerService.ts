import cron, { type ScheduledTask } from "node-cron";
import ServiceBase from "../ServiceBase.js";
import Value from "../../model/Value.js";
import type ServiceLocator from "../ServiceLocator.js";
import type SchedulerServiceSettings from "./SchedulerServiceSettings.js";
import type ScheduleConfig from "../asset/ScheduleConfig.js";
import logger from "../../util/logger.js";

export default class SchedulerService extends ServiceBase {
	options: SchedulerServiceSettings;
	tasks: ScheduledTask[];

	constructor(services: ServiceLocator, options: SchedulerServiceSettings) {
		super(services);

		this.options = options;
		this.tasks = [];
	}

	override start() {
		this.tasks = this.parseSchedules();

		return Promise.resolve();
	}

	override stop() {
		this.tasks.forEach((task) => {
			task.stop();
		});

		return Promise.resolve();
	}

	parseSchedules() {
		const tasks: ScheduledTask[] = [];
		const assetService = this.services.getAssetService();

		assetService.getMeasurements().forEach((measurement) => {
			measurement.schedules.forEach((schedule) => {
				tasks.push(
					cron.schedule(schedule.cron, () => {
						this.executeSchedule(
							measurement.deviceId,
							measurement.id,
							schedule
						).catch((e: unknown) => {
							logger.error(
								e,
								`Failed to execute action ${schedule.name}.`
							);
						});
					})
				);
			});
		});

		return tasks;
	}

	async executeSchedule(
		deviceId: string,
		measurementId: string,
		schedule: ScheduleConfig
	) {
		logger.info(`Executing schedule "${schedule.name}".`);

		await this.services
			.getDataService()
			.control(
				new Value(deviceId, measurementId, schedule.value, Date.now())
			);
	}
}
