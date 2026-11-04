import type IntegrationConfig from "../IntegrationConfig.ts";

export default interface ElectricityPriceIntegrationConfig extends IntegrationConfig {
	region: string;
	cron: string;
}
