export default interface Schedule {
	start(run: () => void): void;
	stop(): Promise<void> | void;
}
