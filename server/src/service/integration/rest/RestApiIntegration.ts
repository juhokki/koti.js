import type Value from "../../../model/Value.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import IntegrationBase from "../IntegrationBase.ts";
import type RestApiIntegrationSettings from "./RestApiIntegrationConfig.ts";

export default class RestApiIntegration extends IntegrationBase {
	options: RestApiIntegrationSettings;

	constructor(services: ServiceLocator, options: RestApiIntegrationSettings) {
		super(services);

		this.options = options;
	}

	async write(values: Value[]) {
		await this.services.getDataService().write(values);
	}
}
