import ServiceBase from "../ServiceBase.js";
import * as Messages from "../../constants/Messages.js";
import DatabaseFactory from "./database/DatabaseFactory.js";
import type DataServiceSettings from "./DataServiceSettings.js";
import type ServiceLocator from "../ServiceLocator.js";
import type Database from "./database/Database.js";
import ValueCache from "./ValueCache.js";
import type Value from "../../model/Value.js";

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
		const measuredValues = values.filter((value) => {
			try {
				this.services
					.getAssetService()
					.getMeasurement(value.deviceId, value.measurementId);
				return true;
			} catch (error) {
				return false;
			}
		});
		const newValues = measuredValues.filter((value) => {
			const currentValue = this.latestValueCache.get(
				value.deviceId,
				value.measurementId
			);
			const valueHasChanged =
				!currentValue || currentValue.value !== value.value;

			return valueHasChanged;
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
			console.log("Failed to write values.", e);
		}
	}

	control(value: Value): Promise<void> {
		return this.services
			.getIntegrationService()
			.onValueControlled(value.deviceId, value.measurementId, value);
	}
}
