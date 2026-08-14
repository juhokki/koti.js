import fetch from "node-fetch";
import { type ShellyDevicePlugS } from "shellies";
import Value from "../../../../model/Value.ts";
import type ServiceLocator from "../../../ServiceLocator.ts";
import UnconfiguredMeasurementError from "../UnconfiguredMeasurementError.ts";
import type ShellyDeviceHandler from "./ShellyDeviceHandler.ts";
import logger from "../../../../util/logger.ts";

export const RELAY_0 = "relay0";
export const POWER_0 = "power0";

export default class ShellyPlugSHandler implements ShellyDeviceHandler {
	services: ServiceLocator;
	device: ShellyDevicePlugS;

	constructor(services: ServiceLocator, device: ShellyDevicePlugS) {
		this.services = services;
		this.device = device;
		this.device.on("change", (prop, value) => {
			this.onDeviceValueChanged(prop, value);
		});
		this.onDeviceValueChanged(RELAY_0, this.device[RELAY_0]);
		this.onDeviceValueChanged(POWER_0, this.device[POWER_0]);
	}

	onDeviceValueChanged(prop: string, value: number | boolean) {
		this.writeValue(prop, value).catch((e: unknown) => {
			if (e instanceof UnconfiguredMeasurementError) {
				return;
			}

			logger.error(e, "Failed to write values.");
		});
	}

	writeValue(prop: string, value: number | boolean) {
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

	control(measurementId: string, value: Value) {
		switch (measurementId) {
			case RELAY_0:
				return this.toggleRelay0(value);
			default:
				throw new Error(
					`Missing control implementation for measurement ${measurementId}.`
				);
		}
	}

	async toggleRelay0(value: Value) {
		const url = `http://${this.device.host}/relay/0`;
		const params = new URLSearchParams();
		params.append("turn", value.value ? "on" : "off");

		const options = {
			method: "POST",
			body: params
		};

		await fetch(url, options);
	}
}
