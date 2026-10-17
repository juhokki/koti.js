export type LogLevelName =
	"trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
	level: number;
	time: number;
	msg?: string;
	[key: string]: unknown;
}

export interface LogPage {
	entries: LogEntry[];
}
