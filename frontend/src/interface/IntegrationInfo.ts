export interface IntegrationParameter {
	name: string;
	value: string | number;
}

export interface IntegrationInfo {
	name: string;
	parameters: IntegrationParameter[];
}
