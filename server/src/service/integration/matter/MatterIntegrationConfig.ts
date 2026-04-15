import type IntegrationConfig from "../IntegrationConfig.js";

export default interface MatterIntegrationSettings extends IntegrationConfig {
	enabled: boolean;
	storageLocation: string;
	controllerId: string;
}
