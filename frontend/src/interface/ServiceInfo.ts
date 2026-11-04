export interface ServiceParameter {
	name: string;
	value: string | number;
}

export interface ServiceInfo {
	name: string;
	parameters: ServiceParameter[];
}
