export interface SystemDiskState {
	disk: DiskState;
	uptime: number;
}

export interface DiskState {
	size: number;
	free: number;
}
