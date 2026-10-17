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
import type Measurement from "../../model/Measurement.ts";

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
		const startupStartedAt = Date.now();
		const databaseName = this.database.constructor.name;
		const databaseStartedAt = Date.now();

		logger.debug({ database: databaseName }, "Starting database.");

		await this.database.start();

		logger.debug(
			{
				database: databaseName,
				durationMs: Date.now() - databaseStartedAt
			},
			"Database started."
		);

		const cacheStartedAt = Date.now();
		this.latestValueCache = await this.initializeCache();

		logger.debug(
			{
				durationMs: Date.now() - cacheStartedAt,
				totalDurationMs: Date.now() - startupStartedAt
			},
			"Data service startup complete."
		);
	}

	override async stop() {
		await this.database.stop();
	}

	buildDatabase() {
		const factory = new DatabaseFactory(this.options.database);
		const database = factory.create();

		return database;
	}

	async initializeCache(): Promise<ValueCache> {
		const cache = new ValueCache();
		const readStartedAt = Date.now();
		const values = await this.database.readLatestValues();

		logger.debug(
			{
				durationMs: Date.now() - readStartedAt,
				valueCount: values.length
			},
			"Read latest values for cache."
		);

		const cacheStartedAt = Date.now();
		values.forEach((value) => {
			cache.set(value.deviceId, value.measurementId, value);
		});
		
		logger.debug(
			{
				durationMs: Date.now() - cacheStartedAt,
				valueCount: values.length
			},
			"Populated latest-value cache."
		);

		return cache;
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

			if (!this.verifyMeasurementType(measurement, value)) {
				logger.warn(
					{ measurement, value },
					"Value type does not match measurement type."
				);
				return;
			}

			const currentValue = this.latestValueCache.get(
				value.deviceId,
				value.measurementId
			);

			if (measurement.type === MeasurementType.Counter) {
				if (currentValue) {
					// Increment counter type by new value.
					value.value =
						(currentValue.value as number) +
						(value.value as number);
				}
			}

			if (currentValue?.value === value.value) {
				// Value has not changed, ignore...
				return;
			}

			newValues.push(value);
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
	verifyMeasurementType(measurement: Measurement, value: Value) {
		switch (measurement.type) {
			case MeasurementType.Number:
			case MeasurementType.Counter:
				return typeof value.value === "number";
			case MeasurementType.String:
				return typeof value.value === "string";
			case MeasurementType.Boolean:
				return typeof value.value === "boolean";
			default:
				throw new Error("Measurement type not recognized.");
		}
	}

	control(value: Value): Promise<void> {
		return this.services
			.getIntegrationService()
			.onValueControlled(value.deviceId, value.measurementId, value);
	}
}
