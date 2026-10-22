export interface SystemState {
	disk: DiskState;
	uptime: number;
	integrations: string[];
}

export interface DiskState {
	size: number;
	free: number;
}
