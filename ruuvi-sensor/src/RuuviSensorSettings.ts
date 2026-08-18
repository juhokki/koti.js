export default interface RuuviSensorSettings {
	url: string;
	api: {
		username: string;
		password: string;
	};
	writeBuffer: {
		enabled: boolean;
		interval: number;
	};
}
