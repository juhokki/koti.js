import type Value from "../../../model/Value.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import IntegrationBase from "../IntegrationBase.ts";
import type IntegrationConfig from "../IntegrationConfig.ts";

export default class RestApiIntegration extends IntegrationBase {
	options: IntegrationConfig;

	constructor(services: ServiceLocator, options: IntegrationConfig) {
		super(services);

		this.options = options;
	}

	async write(values: Value[]) {
		await this.services.getDataService().write(values);
	}
}
