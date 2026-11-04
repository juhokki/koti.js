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
import type ServiceParameter from "../ServiceParameter.ts";

export default class DataService extends ServiceBase {
	options: DataServiceSettings;
	database: Database;
	latestValueCache = new ValueCache();
	private readonly incomingValueCounts = new Array<number>(60).fill(0);
	private readonly incomingValueBucketSeconds = new Array<number>(60).fill(
		-1
	);

	constructor(services: ServiceLocator, options: DataServiceSettings) {
		super(services);

		this.options = options;
		this.database = this.buildDatabase();
	}

	override getParameters(): ServiceParameter[] {
		return [
			{ name: "Database", value: this.database.constructor.name },
			{
				name: "Cached values count",
				value: this.latestValueCache.values().length
			},
			{
				name: "Incoming values per minute",
				value: this.getIncomingValuesPerMinute()
			}
		];
	}

	private getIncomingValuesPerMinute() {
		const currentSecond = Math.floor(Date.now() / 1000);
		const oldestSecond = currentSecond - 59;

		return this.incomingValueCounts.reduce((total, count, index) => {
			const bucketSecond = this.incomingValueBucketSeconds[index];
			if (
				bucketSecond !== undefined &&
				bucketSecond >= oldestSecond &&
				bucketSecond <= currentSecond
			) {
				return total + count;
			}
			return total;
		}, 0);
	}

	private recordIncomingValues(count: number) {
		if (count === 0) {
			return;
		}

		const currentSecond = Math.floor(Date.now() / 1000);
		const bucketIndex = currentSecond % 60;
		if (this.incomingValueBucketSeconds[bucketIndex] !== currentSecond) {
			this.incomingValueBucketSeconds[bucketIndex] = currentSecond;
			this.incomingValueCounts[bucketIndex] = 0;
		}

		this.incomingValueCounts[bucketIndex] =
			(this.incomingValueCounts[bucketIndex] ?? 0) + count;
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
			this.emit(
				Messages.INITIAL_VALUE,
				value.deviceId,
				value.measurementId,
				value
			);
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
		this.recordIncomingValues(values.length);
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

	async control(value: Value): Promise<void> {
		const measurement = this.services
			.getAssetService()
			.getMeasurement(value.deviceId, value.measurementId);
		this.verifyMeasurementRange(measurement, value);

		await this.services
			.getIntegrationService()
			.onValueControlled(value.deviceId, value.measurementId, value);
	}

	private verifyMeasurementRange(measurement: Measurement, value: Value) {
		if (
			measurement.type !== MeasurementType.Number &&
			measurement.type !== MeasurementType.Counter
		) {
			return;
		}
		if (typeof value.value !== "number") {
			throw new Error(
				`Value for measurement ${measurement.id} must be numeric.`
			);
		}

		const isAllowed =
			measurement.steps !== undefined
				? measurement.steps.includes(value.value)
				: (measurement.min === undefined ||
						value.value >= measurement.min) &&
					(measurement.max === undefined ||
						value.value <= measurement.max);

		if (!isAllowed) {
			throw new Error(
				`Value ${String(value.value)} is not allowed for measurement ${measurement.id}.`
			);
		}
	}
}
