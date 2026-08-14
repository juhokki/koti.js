import type IntegrationConfig from "../IntegrationConfig.ts";

export default interface MatterIntegrationSettings extends IntegrationConfig {
	enabled: boolean;
	storageLocation: string;
	controllerId: string;
}
