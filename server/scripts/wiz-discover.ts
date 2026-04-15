import type IntegrationConfig from "../src/service/integration/IntegrationConfig.js";
import WizIntegration from "../src/service/integration/wiz/WizIntegration.js";
import type WizIntegrationSettings from "../src/service/integration/wiz/WizIntegrationSettings.js";
import ServiceLocator from "../src/service/ServiceLocator.js";
import { readConfigFile } from "../src/util/FileUtil.js";

try {
	const config = readConfigFile<IntegrationConfig[]>(
		"../conf/production/integrations.json"
	);
	const integrationConfig = config.find(
		(c) => c.name === WizIntegration.name
	);

	if (!integrationConfig) {
		throw new Error("Config not found");
	}

	const integration = new WizIntegration(
		new ServiceLocator(),
		integrationConfig as WizIntegrationSettings
	);

	await integration.discover();
	console.log("Wiz bulbs", integration.bulbs);
} catch (e) {
	console.log("Login failed.", e);
}
