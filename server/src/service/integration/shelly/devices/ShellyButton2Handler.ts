import { type ShellyDeviceButton2 } from "shellies";
import Value from "../../../../model/Value.js";
import type ServiceLocator from "../../../ServiceLocator.js";
import UnconfiguredMeasurementError from "../UnconfiguredMeasurementError.js";
import type ShellyDeviceHandler from "./ShellyDeviceHandler.js";
import logger from "../../../../util/logger.js";

export const INPUT_EVENT_COUNTER_0 = "inputEventCounter0";
export const BATTERY = "battery";

export default class ShellyButton2Handler implements ShellyDeviceHandler {
	services: ServiceLocator;
	device: ShellyDeviceButton2;

	constructor(services: ServiceLocator, device: ShellyDeviceButton2) {
		this.services = services;
		this.device = device;
		this.device.on("change", (prop, value) => {
			this.onDeviceValueChanged(prop, value);
		});
		this.onDeviceValueChanged(
			INPUT_EVENT_COUNTER_0,
			this.device[INPUT_EVENT_COUNTER_0]
		);
		this.onDeviceValueChanged(BATTERY, this.device[BATTERY]);
	}

	onDeviceValueChanged(prop: string, value: number) {
		this.writeValue(prop, value).catch((e: unknown) => {
			if (e instanceof UnconfiguredMeasurementError) {
				return;
			}

			logger.error(e, "Failed to write values.");
		});
	}

	writeValue(prop: string, value: number) {
		const device = this.services
			.getAssetService()
			.getDevice(this.device.id);
		const measurement = device.measurements.find(
			(measurement) => measurement.id === prop
		);

		if (!measurement) {
			return Promise.reject(new UnconfiguredMeasurementError());
		}

		return this.services
			.getDataService()
			.write([new Value(this.device.id, prop, value, Date.now())]);
	}
}
