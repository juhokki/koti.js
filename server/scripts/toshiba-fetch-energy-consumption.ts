import ServiceLocator from "../src/service/ServiceLocator.js";
import type IntegrationConfig from "../src/service/integration/IntegrationConfig.js";
import ToshibaAcIntegration from "../src/service/integration/toshiba/ToshibaAcIntegration.js";
import type ToshibaAcIntegrationSettings from "../src/service/integration/toshiba/ToshibaAcIntegrationConfig.js";
import { readConfigFile } from "../src/util/FileUtil.js";

try {
	const config = readConfigFile<IntegrationConfig[]>(
		"../conf/production/integrations.json"
	);
	const toshibaAcConfig = config.find(
		(c) => c.name === ToshibaAcIntegration.name
	);

	if (!toshibaAcConfig) {
		throw new Error("Config not found");
	}

	const integration = new ToshibaAcIntegration(
		new ServiceLocator(),
		toshibaAcConfig as ToshibaAcIntegrationSettings
	);

	await integration.login();

	const devices = await integration.getDevices();
	const foundDevice = devices[0];

	if (!foundDevice) {
		throw new Error("Device not found");
	}

	// TODO:
	//const response = await integration.getDeviceEnergyConsumption(foundDevice);
	//console.log("Energy consumption", response);
} catch (e) {
	console.log("Login failed.", e);
}
