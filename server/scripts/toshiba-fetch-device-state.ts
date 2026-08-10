import ServiceLocator from "../src/service/ServiceLocator.js";
import type IntegrationConfig from "../src/service/integration/IntegrationConfig.js";
import ToshibaAcIntegration from "../src/service/integration/toshiba/ToshibaAcIntegration.js";
import type ToshibaAcIntegrationSettings from "../src/service/integration/toshiba/ToshibaAcIntegrationConfig.js";
import { readConfigFile } from "../src/util/FileUtil.js";

try {
	const config = readConfigFile<IntegrationConfig[]>(
		"../conf/integrations.json"
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

	const response = await integration.getDeviceState(foundDevice);

	console.log("ToshibaAC device state", response);
} catch (e) {
	console.log("ToshibaAC fetch device state failed.", e);
}
