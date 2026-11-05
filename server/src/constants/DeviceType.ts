const DeviceType = {
	MatterIntegration: "MatterIntegration",
	ShellyIntegration: "ShellyIntegration",
	ToshibaAcIntegration: "ToshibaAcIntegration",
	RestApiIntegration: "RestApiIntegration",
	ElectricityPriceIntegration: "ElectricityPriceIntegration",
	OpenWeatherIntegration: "OpenWeatherIntegration"
} as const;

type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export default DeviceType;
