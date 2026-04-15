import type IntegrationConfig from "../IntegrationConfig.js";

export default interface OpenWeatherIntegrationSettings
	extends IntegrationConfig {
	deviceId: string;
	updateInterval: number;
	apiKey: string;
	location: string;
}
