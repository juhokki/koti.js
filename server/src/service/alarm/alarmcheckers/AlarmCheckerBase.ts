import * as Messages from "../../../constants/Messages.ts";
import type AlarmType from "../../../constants/AlarmType.ts";
import Alarm from "../../../model/Alarm.ts";
import type Measurement from "../../../model/Measurement.ts";
import type Value from "../../../model/Value.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import type AlarmCheckerOptions from "./AlarmCheckerOptions.ts";
import logger from "../../../util/logger.ts";

export default class AlarmCheckerBase {
	services: ServiceLocator;
	onChange: (alarms: Alarm[]) => void;
	measurements: Measurement[];
	type: AlarmType;
	alarms: Map<string, Alarm>;

	constructor(services: ServiceLocator, options: AlarmCheckerOptions) {
		this.services = services;
		this.type = options.type;
		this.measurements = this.filter(options.measurements);
		this.onChange = options.onChange;
		this.alarms = new Map();
	}

	filter(measurements: Measurement[]) {
		return measurements.filter((measurement) =>
			measurement.alarms.find(
				(alarmConfig) => alarmConfig.type === this.type
			)
		);
	}

	start() {
		this.measurements.forEach((measurement) => {
			const value = this.services
				.getDataService()
				.readLatestValue(measurement.deviceId, measurement.id);

			if (value) {
				this.check(measurement, value);
			}
		});

		this.services
			.getDataService()
			.on(Messages.VALUE_UPDATED, this.onValueUpdated.bind(this));
	}

	stop() {
		// Override in a subclass.
	}

	check(measurement: Measurement, value: Value) {
		// Override in a subclass.
	}

	onValueUpdated(deviceId: string, measurementId: string, value: Value) {
		const measurement = this.services
			.getAssetService()
			.getMeasurement(deviceId, measurementId);

		if (this.measurements.includes(measurement)) {
			this.check(measurement, value);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
	getConfigAttribute<T>(
		measurement: Measurement,
		attribute: "name" | "type" | "limit"
	): T {
		const alarmConfig = measurement.alarms.find(
			(alarmConfig) => alarmConfig.type === this.type
		);

		if (!alarmConfig) {
			throw new Error(`Missing alarm config for type "${this.type}`);
		}

		return alarmConfig[attribute] as T;
	}

	trigger(measurement: Measurement, time: number) {
		const key = this.getUniqueMeasurementKey(measurement);

		if (!this.alarms.has(key)) {
			const device = this.services
				.getAssetService()
				.getDevice(measurement.deviceId);
			const asset = this.services
				.getAssetService()
				.getDeviceAsset(device.id);
			const name = this.getConfigAttribute<string>(measurement, "name");
			const alarm = new Alarm(
				asset.id,
				asset.name,
				device.id,
				device.name,
				measurement.id,
				measurement.name,
				name,
				time,
				this.getType()
			);

			logger.info(alarm, "Triggering alarm.");

			this.alarms.set(key, alarm);
			this.onChange(this.getAlarms());
		}
	}

	getType(): AlarmType {
		return this.type;
	}

	clear(key: string) {
		if (this.alarms.has(key)) {
			logger.info(this.alarms.get(key), "Deleting alarm.");

			this.alarms.delete(key);
			this.onChange(this.getAlarms());
		}
	}

	getAlarms() {
		return Array.from(this.alarms.values());
	}

	getUniqueMeasurementKey(measurement: Measurement) {
		return `${measurement.deviceId}-${measurement.id}`;
	}
}
