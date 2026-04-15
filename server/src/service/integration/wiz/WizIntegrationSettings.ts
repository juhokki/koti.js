import type IntegrationConfig from "../IntegrationConfig.js";

export default interface WizIntegrationSettings extends IntegrationConfig {
	enabled: boolean;
	address: string;
	interface: string | undefined;
	discoverInterval: number;
	heartbeatInterval: number;
}
