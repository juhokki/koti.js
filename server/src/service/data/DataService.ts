import ServiceBase from "../ServiceBase.ts";
import * as Messages from "../../constants/Messages.ts";
import DatabaseFactory from "./database/DatabaseFactory.ts";
import type DataServiceSettings from "./DataServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type Database from "./database/Database.ts";
import ValueCache from "./ValueCache.ts";
import type Value from "../../model/Value.ts";
import MeasurementType from "../../constants/MeasurementType.ts";
import logger from "../../util/logger.ts";

export default class DataService extends ServiceBase {
	options: DataServiceSettings;
	database: Database;
	latestValueCache = new ValueCache();

	constructor(services: ServiceLocator, options: DataServiceSettings) {
		super(services);

		this.options = options;
		this.database = this.buildDatabase();
	}

	override async start() {
		await this.database.start();

		const values = await this.database.readLatestValues();

		this.latestValueCache = new ValueCache();

		values.forEach((value) => {
			this.latestValueCache.set(
				value.deviceId,
				value.measurementId,
				value
			);
		});
	}

	override async stop() {
		await this.database.stop();
	}

	buildDatabase() {
		const factory = new DatabaseFactory(this.options.database);
		const database = factory.create();

		return database;
	}

	readLatestValues() {
		return this.latestValueCache.values();
	}

	readLatestValue(deviceId: string, measurementId: string) {
		return this.latestValueCache.get(deviceId, measurementId);
	}

	readDeviceValues(deviceId: string, startTime: number, endTime: number) {
		return this.database.readValueRange(deviceId, startTime, endTime);
	}

	async write(values: Value[]): Promise<void> {
		const newValues: Value[] = [];

		values.forEach((value) => {
			let measurement;

			try {
				measurement = this.services
					.getAssetService()
					.getMeasurement(value.deviceId, value.measurementId);
			} catch (error) {
				// Measurement not configured, value can be ignored...
				return;
			}

			const currentValue = this.latestValueCache.get(
				value.deviceId,
				value.measurementId
			);

			if (measurement.type === MeasurementType.Counter) {
				if (currentValue) {
					// Increment counter type by new value.
					value.value = (currentValue.value as number) + (value.value as number);
				}
			}

			if (!currentValue || currentValue.value !== value.value) {
				newValues.push(value);
			}
		});

		if (newValues.length === 0) {
			return Promise.resolve();
		}

		newValues.forEach((value) => {
			this.latestValueCache.set(
				value.deviceId,
				value.measurementId,
				value
			);
			this.emit(
				Messages.VALUE_UPDATED,
				value.deviceId,
				value.measurementId,
				value
			);
		});

		try {
			await this.database.write(newValues);
		} catch (e) {
			logger.error(e, "Failed to write values.");
		}
	}

	control(value: Value): Promise<void> {
		return this.services
			.getIntegrationService()
			.onValueControlled(value.deviceId, value.measurementId, value);
	}
}
