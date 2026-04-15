import fetch from "node-fetch";
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

	const token = integration.token;

	if (!token) {
		throw new Error("Missing token");
	}

	await registerClient(
		token.token_type,
		token.access_token,
		toshibaAcConfig as ToshibaAcIntegrationSettings
	);
} catch (e) {
	console.log("Register device failed.", e);
}

async function registerClient(
	accessTokenType: string,
	accessToken: string,
	config: ToshibaAcIntegrationSettings
) {
	const url =
		"https://mobileapi.toshibahomeaccontrols.com/api/Consumer/RegisterMobileDevice";
	const options = {
		method: "POST",
		body: JSON.stringify({
			DeviceID: config.deviceId,
			DeviceType: "1",
			Username: config.username
		}),
		headers: {
			"Content-Type": "application/json",
			Authorization: `${accessTokenType} ${accessToken}`
		}
	};

	const response = await fetch(url, options);
	const data = (await response.json()) as Record<
		string,
		Record<string, string>
	>;

	if (!data.ResObj?.SasToken) {
		throw new Error("Missing SasToken in response.");
	}

	console.log(
		"Registration complete. Save the SasToken to integrations.json."
	);
	console.log(response);
}
