import type Value from "../../model/Value.ts";
import { readConfigFile } from "../../util/FileUtil.ts";
import ServiceBase from "../ServiceBase.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type IntegrationBase from "./IntegrationBase.ts";
import type IntegrationConfig from "./IntegrationConfig.ts";
import type IntegrationServiceSettings from "./IntegrationServiceSettings.ts";
import MatterIntegration from "./matter/MatterIntegration.ts";
import type MatterIntegrationConfig from "./matter/MatterIntegrationConfig.ts";
import OpenWeatherIntegration from "./openweather/OpenWeatherIntegration.ts";
import type OpenWeatherIntegrationConfig from "./openweather/OpenWeatherIntegrationConfig.ts";
import RestApiIntegration from "./rest/RestApiIntegration.ts";
import ShellyIntegration from "./shelly/ShellyIntegration.ts";
import ToshibaAcIntegration from "./toshiba/ToshibaAcIntegration.ts";
import type ToshibaAcIntegrationConfig from "./toshiba/ToshibaAcIntegrationConfig.ts";
import logger from "../../util/logger.ts";

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
			logger.info(
				`Starting integration ${integration.constructor.name}.`
			);
			await integration.start();
		}
	}

	override async stop() {
		for (const integration of this.integrations.values()) {
			logger.info(
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
						new RestApiIntegration(this.services, config)
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
						new ShellyIntegration(this.services, config)
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
