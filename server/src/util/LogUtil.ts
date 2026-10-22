import { format } from "util";
import { logBuffer, type LogBuffer } from "./LogBuffer.ts";
import logger from "./logger.ts";

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
	end: number;
	levels: number[];
}

export interface LogPage {
	entries: LogEntry[];
}

export function readLogs(
	query: LogQuery,
	buffer: LogBuffer = logBuffer
): LogPage {
	const entries = buffer
		.getAll()
		.filter(
			(e) =>
				query.levels.includes(e.level) &&
				e.time >= query.start &&
				e.time <= query.end
		);

	return { entries: entries.reverse() };
}

export function toPinoArguments(args: unknown[]): [string] | [Error, string] {
	const errIndex = args.findIndex((a) => a instanceof Error);

	if (errIndex === -1) {
		return [format(...args)];
	}

	// Pass the error as the merging object, and format the rest as the message
	const err = args[errIndex] as Error;
	const rest = args.filter((_, i) => i !== errIndex);
	
	return [err, rest.length ? format(...rest) : err.message];
}

// Pino's overloads reject a spread union of tuples, so branch on the tuple length
function logWith(level: "trace" | "debug" | "info" | "warn" | "error", args: unknown[]) {
	const pinoArgs = toPinoArguments(args);

	if (pinoArgs.length === 1) {
		logger[level](pinoArgs[0]);
	} else {
		logger[level](pinoArgs[0], pinoArgs[1]);
	}
}

// Redirects console output from dependencies to the logger
export function redirectConsole() {
	/* eslint-disable no-console */
	console.log = console.info = (...args: unknown[]) => { logWith("info", args); };
	console.trace = (...args: unknown[]) => { logWith("trace", args); };
	console.debug = (...args: unknown[]) => { logWith("debug", args); };
	console.warn = (...args: unknown[]) => { logWith("warn", args); };
	console.error = (...args: unknown[]) => { logWith("error", args); };
	/* eslint-enable no-console */
}