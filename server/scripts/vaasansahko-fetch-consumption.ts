import Value from "../src/model/Value.js";
import ServiceLocator from "../src/service/ServiceLocator.js";
import type IntegrationConfig from "../src/service/integration/IntegrationConfig.js";
import VaasanSahkoIntegration from "../src/service/integration/vaasansahko/VaasanSahkoIntegration.js";
import type VaasanSahkoIntegrationSettings from "../src/service/integration/vaasansahko/VaasanSahkoIntegrationConfig.js";
import { readConfigFile } from "../src/util/FileUtil.js";

try {
	const config = readConfigFile<IntegrationConfig[]>(
		"../conf/integrations.json"
	);
	const integrationConfig = config.find(
		(c) => c.name === VaasanSahkoIntegration.name
	);

	if (!integrationConfig) {
		throw new Error("Config not found");
	}

	const integration = new VaasanSahkoIntegration(
		new ServiceLocator(),
		integrationConfig as VaasanSahkoIntegrationSettings
	);
	const since = new Value("", "", "", Date.now() - 2592000000);

	await integration.login();
	const consumption = await integration.fetchConsumption(since);

	console.log("Consumption", consumption);
} catch (e) {
	console.log("Failed to fetch.", e);
}
