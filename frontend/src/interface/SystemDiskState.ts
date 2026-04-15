export interface SystemDiskState {
	disk: DiskState;
}

export interface DiskState {
	size: number;
	free: number;
}
