import ServiceBase from "../ServiceBase.ts";
import Value from "../../model/Value.ts";
import ScheduleType from "../../constants/ScheduleType.ts";
import CronSchedule from "./schedules/CronSchedule.ts";
import SuncalcSchedule from "./schedules/SuncalcSchedule.ts";
import type Schedule from "./schedules/Schedule.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type SchedulerServiceSettings from "./SchedulerServiceSettings.ts";
import type ScheduleConfig from "../asset/ScheduleConfig.ts";
import type {
	CronScheduleOptions,
	SuncalcScheduleOptions
} from "../asset/ScheduleConfig.ts";
import logger from "../../util/logger.ts";

export default class SchedulerService extends ServiceBase {
	options: SchedulerServiceSettings;
	tasks: Schedule[];

	constructor(services: ServiceLocator, options: SchedulerServiceSettings) {
		super(services);

		this.options = options;
		this.tasks = [];
	}

	override start() {
		this.tasks = this.parseSchedules();

		return Promise.resolve();
	}

	override async stop() {
		for (const task of this.tasks) {
			await task.stop();
		}
	}

	parseSchedules() {
		const tasks: Schedule[] = [];
		const assetService = this.services.getAssetService();

		assetService.getMeasurements().forEach((measurement) => {
			measurement.schedules.forEach((schedule: ScheduleConfig) => {
				const run = () => {
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
				};

				const task: Schedule =
					schedule.type === ScheduleType.Cron
						? new CronSchedule(
								schedule.options as CronScheduleOptions
							)
						: new SuncalcSchedule(
								schedule.options as SuncalcScheduleOptions
							);

				task.start(run);
				tasks.push(task);
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
