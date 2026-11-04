const DeviceType = {
	VaasanSahkoIntegration: "VaasanSahkoIntegration",
	MatterIntegration: "MatterIntegration",
	WizIntegration: "WizIntegration",
	ShellyIntegration: "ShellyIntegration",
	ToshibaAcIntegration: "ToshibaAcIntegration",
	RestApiIntegration: "RestApiIntegration",
	ElectricityPriceIntegration: "ElectricityPriceIntegration"
} as const;

type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export default DeviceType;
