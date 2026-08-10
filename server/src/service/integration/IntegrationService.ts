import type Value from "../../model/Value.js";
import { readConfigFile } from "../../util/FileUtil.js";
import ServiceBase from "../ServiceBase.js";
import type ServiceLocator from "../ServiceLocator.js";
import type IntegrationBase from "./IntegrationBase.js";
import type IntegrationConfig from "./IntegrationConfig.js";
import type IntegrationServiceSettings from "./IntegrationServiceSettings.js";
import MatterIntegration from "./matter/MatterIntegration.js";
import type MatterIntegrationConfig from "./matter/MatterIntegrationConfig.js";
import OpenWeatherIntegration from "./openweather/OpenWeatherIntegration.js";
import type OpenWeatherIntegrationConfig from "./openweather/OpenWeatherIntegrationConfig.js";
import RestApiIntegration from "./rest/RestApiIntegration.js";
import type RestApiIntegrationConfig from "./rest/RestApiIntegrationConfig.js";
import ShellyIntegration from "./shelly/ShellyIntegration.js";
import type ShellyIntegrationConfig from "./shelly/ShellyIntegrationConfig.js";
import ToshibaAcIntegration from "./toshiba/ToshibaAcIntegration.js";
import type ToshibaAcIntegrationConfig from "./toshiba/ToshibaAcIntegrationConfig.js";
import WizIntegration from "./wiz/WizIntegration.js";
import type WizIntegrationConfig from "./wiz/WizIntegrationSettings.js";

export default class IntegrationService extends ServiceBase {
	options: IntegrationServiceSettings;
	integrations: Map<string, IntegrationBase>;

	constructor(services: ServiceLocator, options: IntegrationServiceSettings) {
		super(services);

		this.options = options;
		this.integrations = this.createIntegrations();
	}

	override async start() {
		for (const integration of this.integrations.values()) {
			console.log(
				`Starting integration ${integration.constructor.name}.`
			);
			await integration.start();
		}
	}

	override async stop() {
		for (const integration of this.integrations.values()) {
			console.log(
				`Stopping integration ${integration.constructor.name}.`
			);
			await integration.stop();
		}
	}

	createIntegrations(): Map<string, IntegrationBase> {
		const integrations = new Map<string, IntegrationBase>();

		this.getEnabledIntegrationConfigs().forEach((config) => {
			switch (config.name) {
				case RestApiIntegration.name:
					integrations.set(
						RestApiIntegration.name,
						new RestApiIntegration(
							this.services,
							config as RestApiIntegrationConfig
						)
					);
					break;
				case OpenWeatherIntegration.name:
					integrations.set(
						OpenWeatherIntegration.name,
						new OpenWeatherIntegration(
							this.services,
							config as OpenWeatherIntegrationConfig
						)
					);
					break;
				case ShellyIntegration.name:
					integrations.set(
						ShellyIntegration.name,
						new ShellyIntegration(
							this.services,
							config as ShellyIntegrationConfig
						)
					);
					break;
				case ToshibaAcIntegration.name:
					integrations.set(
						ToshibaAcIntegration.name,
						new ToshibaAcIntegration(
							this.services,
							config as ToshibaAcIntegrationConfig
						)
					);
					break;
				case MatterIntegration.name:
					integrations.set(
						MatterIntegration.name,
						new MatterIntegration(
							this.services,
							config as MatterIntegrationConfig
						)
					);
					break;
				case WizIntegration.name:
					integrations.set(
						WizIntegration.name,
						new WizIntegration(
							this.services,
							config as WizIntegrationConfig
						)
					);
					break;
				default:
					throw new Error(
						`Implementation for integration ${config.name} not found`
					);
			}
		});

		return integrations;
	}

	getEnabledIntegrationConfigs() {
		const config = readConfigFile<IntegrationConfig[]>(this.options.file);

		return config.filter((integrationConfig) => integrationConfig.enabled);
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
	get<T extends IntegrationBase>(name: string): T {
		const integration = this.integrations.get(name);

		if (!integration) {
			throw new Error(`Missing integration "${name}"`);
		}

		return integration as T;
	}

	onValueControlled(
		deviceId: string,
		measurementId: string,
		value: Value
	): Promise<void> {
		const measurement = this.services
			.getAssetService()
			.getMeasurement(deviceId, measurementId);

		if (measurement.controllable) {
			const device = this.services.getAssetService().getDevice(deviceId);
			const integration = this.get(device.type);

			return integration.control(deviceId, measurementId, value);
		} else {
			return Promise.reject(
				new Error(
					`Measurement ${deviceId} ${measurementId} is not controllable`
				)
			);
		}
	}
}
