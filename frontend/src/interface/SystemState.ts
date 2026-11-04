export interface SystemState {
	disk: DiskState;
	uptime: number;
	integrations: string[];
	services: string[];
}

export interface DiskState {
	size: number;
	free: number;
}
