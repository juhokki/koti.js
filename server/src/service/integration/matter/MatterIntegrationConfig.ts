import type IntegrationConfig from "../IntegrationConfig.ts";

export default interface MatterIntegrationSettings extends IntegrationConfig {
	serverUrl: string;
	websocketUrl: string;
}
