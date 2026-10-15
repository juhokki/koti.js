import { logBuffer, type LogBuffer } from "./LogBuffer.ts";

export const LOG_LEVELS = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60
} as const;

export type LogLevelName = keyof typeof LOG_LEVELS;

export interface LogEntry {
	level: number;
	time: number;
	msg?: string;
	[key: string]: unknown;
}

export interface LogQuery {
	start: number;
	limit: number;
	minLevel: number;
}

export interface LogPage {
	total: number;
	start: number;
	limit: number;
	entries: LogEntry[];
}

export function readLogs(
	query: LogQuery,
	buffer: LogBuffer = logBuffer
): LogPage {
	const matching = buffer.getAll().filter((e) => e.level >= query.minLevel);

	matching.reverse();

	return {
		total: matching.length,
		start: query.start,
		limit: query.limit,
		entries: matching.slice(query.start, query.start + query.limit)
	};
}
