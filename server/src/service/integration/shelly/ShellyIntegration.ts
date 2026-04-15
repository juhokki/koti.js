import shellies, {
	type ShellyDevice,
	type ShellyDeviceButton2,
	type ShellyDevicePlugS
} from "shellies";
import IntegrationBase from "../IntegrationBase.js";
import Value from "../../../model/Value.js";
import type ShellyIntegrationSettings from "./ShellyIntegrationConfig.js";
import type ServiceLocator from "../../ServiceLocator.js";
import ShellyButton2Handler from "./devices/ShellyButton2Handler.js";
import ShellyPlugSHandler from "./devices/ShellyPlugSHandler.js";
import type ShellyDeviceHandler from "./devices/ShellyDeviceHandler.js";

export const ShellyDeviceTypeButton2 = "SHBTN-2";
export const ShellyDeviceTypePlugS = "SHPLG-S";

export default class ShellyIntegration extends IntegrationBase {
	options: ShellyIntegrationSettings;
	deviceHandlers: Map<string, ShellyDeviceHandler>;

	constructor(services: ServiceLocator, options: ShellyIntegrationSettings) {
		super(services);

		this.options = options;
		this.deviceHandlers = new Map();
	}

	override start() {
		shellies.on("discover", (shellyDevice) => {
			this.onDeviceDiscovered(shellyDevice);
		});

		shellies.start();

		return Promise.resolve();
	}

	override stop() {
		shellies.stop();

		return Promise.resolve();
	}

	onDeviceDiscovered(shellyDevice: ShellyDevice) {
		try {
			this.services.getAssetService().getDevice(shellyDevice.id);
		} catch (error) {
			console.log(
				`Discovered Shelly device with id ${shellyDevice.id} is not configured. Ignoring.`
			);
			return;
		}

		console.log(
			`Discovered Shelly device with id ${shellyDevice.id} and type ${shellyDevice.type}.`
		);

		switch (shellyDevice.type) {
			case ShellyDeviceTypeButton2: {
				this.deviceHandlers.set(
					shellyDevice.id,
					new ShellyButton2Handler(
						this.services,
						shellyDevice as ShellyDeviceButton2
					)
				);
				break;
			}
			case ShellyDeviceTypePlugS: {
				this.deviceHandlers.set(
					shellyDevice.id,
					new ShellyPlugSHandler(
						this.services,
						shellyDevice as ShellyDevicePlugS
					)
				);
				break;
			}
			default:
				throw new Error(
					`No handler implemented for Shelly device type ${shellyDevice.type as string}`
				);
		}
	}

	override control(
		deviceId: string,
		measurementId: string,
		value: Value
	): Promise<void> {
		const handler = this.deviceHandlers.get(deviceId);

		if (!handler) {
			throw new Error(`Shelly device ${deviceId} not discovered`);
		}

		if (typeof handler.control === "function") {
			return handler.control(measurementId, value);
		} else {
			throw new Error(
				`Shelly device ${deviceId} handler does implement control.`
			);
		}
	}
}
