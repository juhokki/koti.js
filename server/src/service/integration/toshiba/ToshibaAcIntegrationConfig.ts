import type IntegrationConfig from "../IntegrationConfig.js";

export default interface ToshibaAcIntegrationSettings
	extends IntegrationConfig {
	enabled: boolean;
	username: string;
	password: string;
	deviceId: string;
	sasToken: string;
	energyConsumptionUpdateInterval: number;
	stateUpdateInterval: number;
}
