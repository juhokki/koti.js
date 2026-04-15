import type IntegrationConfig from "../IntegrationConfig.js";

export default interface VaasanSahkoIntegrationSettings
	extends IntegrationConfig {
	enabled: boolean;
	deviceId: string;
	measurementId: string;
	schedule: string;
	username: string;
	password: string;
}
