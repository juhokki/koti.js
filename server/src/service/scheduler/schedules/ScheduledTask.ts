export default interface ScheduledTask {
	start(run: () => void): void;
	stop(): Promise<void> | void;
}
