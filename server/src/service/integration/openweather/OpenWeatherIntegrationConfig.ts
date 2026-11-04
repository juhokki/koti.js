import type IntegrationConfig from "../IntegrationConfig.ts";

export default interface OpenWeatherIntegrationSettings extends IntegrationConfig {
	updateInterval: number;
	apiKey: string;
	location: string;
}
