import type IntegrationConfig from "../IntegrationConfig.ts";

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
