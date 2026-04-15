import type Value from "../../../model/Value.js";
import type ServiceLocator from "../../ServiceLocator.js";
import IntegrationBase from "../IntegrationBase.js";
import type RestApiIntegrationSettings from "./RestApiIntegrationConfig.js";

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
