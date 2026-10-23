import { afterEach, expect, test, vi } from "vitest";
import { LogBuffer, logBuffer } from "../src/util/LogBuffer.js";
import {
	readLogs,
	redirectConsole,
	toPinoArguments
} from "../src/util/LogUtil.js";
import logger from "../src/util/logger.js";

/* eslint-disable no-console */
const originalConsole = {
	log: console.log,
	info: console.info,
	trace: console.trace,
	debug: console.debug,
	warn: console.warn,
	error: console.error
};

afterEach(() => {
	console.log = originalConsole.log;
	console.info = originalConsole.info;
	console.trace = originalConsole.trace;
	console.debug = originalConsole.debug;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	vi.restoreAllMocks();
});
/* eslint-enable no-console */

function createBuffer() {
	const buffer = new LogBuffer(10);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 50, time: 2, msg: "b" });
	buffer.add({ level: 40, time: 3, msg: "c" });
	return buffer;
}

test("Returns newest first", () => {
	const buffer = new LogBuffer(10);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 30, time: 2, msg: "b" });
	buffer.add({ level: 30, time: 3, msg: "c" });
	const result = readLogs({ start: 0, end: 10, levels: [30] }, buffer);

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["c", "b", "a"]);
});

test("Filters by time window", () => {
	const result = readLogs({ start: 2, end: 2, levels: [50] }, createBuffer());

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["b"]);
});

test("Filters by selected levels", () => {
	const result = readLogs(
		{ start: 0, end: 10, levels: [40, 50] },
		createBuffer()
	);

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["c", "b"]);
});

test("Returns empty result when buffer is empty", () => {
	const result = readLogs({ start: 0, end: 10, levels: [] }, new LogBuffer());

	expect(result).toStrictEqual({ entries: [] });
});

test("Drops oldest entries when capacity is exceeded", () => {
	const buffer = new LogBuffer(2);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 30, time: 2, msg: "b" });
	buffer.add({ level: 30, time: 3, msg: "c" });

	expect(buffer.getAll().map((e) => e.msg)).toStrictEqual(["b", "c"]);
});

test("Keeps order after wrapping around several times", () => {
	const buffer = new LogBuffer(3);

	for (let i = 1; i <= 8; i++) {
		buffer.add({ level: 30, time: i, msg: String(i) });
	}

	expect(buffer.getAll().map((e) => e.msg)).toStrictEqual(["6", "7", "8"]);
});

test("Clears entries after wrapping", () => {
	const buffer = new LogBuffer(2);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 30, time: 2, msg: "b" });
	buffer.add({ level: 30, time: 3, msg: "c" });
	buffer.clear();
	buffer.add({ level: 30, time: 4, msg: "d" });

	expect(buffer.getAll().map((e) => e.msg)).toStrictEqual(["d"]);
});

test("Parses NDJSON written by pino and ignores invalid chunks", () => {
	const buffer = new LogBuffer();
	buffer.write('{"level":30,"time":1,"msg":"ok"}\n');
	buffer.write("not json");

	expect(buffer.getAll()).toHaveLength(1);
});

test("Captures debug logs in the log buffer", () => {
	logBuffer.clear();
	logger.debug({ marker: "debug-buffer-test" }, "Debug log test.");

	expect(
		logBuffer.getAll().some((entry) => entry.marker === "debug-buffer-test")
	).toBe(true);
});

test("Formats log arguments and preserves error objects", () => {
	const error = new Error("request failed");

	expect(toPinoArguments(["value: %s", "ready"])).toStrictEqual([
		"value: ready"
	]);
	expect(toPinoArguments(["request failed", error])).toStrictEqual([
		error,
		"request failed"
	]);
	expect(toPinoArguments([error])).toStrictEqual([error, error.message]);
});

test("Redirects console methods to matching logger levels", () => {
	const info = vi.spyOn(logger, "info").mockImplementation(() => logger);
	const trace = vi.spyOn(logger, "trace").mockImplementation(() => logger);
	const debug = vi.spyOn(logger, "debug").mockImplementation(() => logger);
	const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);
	const errorLogger = vi
		.spyOn(logger, "error")
		.mockImplementation(() => logger);
	const error = new Error("console failure");

	redirectConsole();
	/* eslint-disable no-console */
	console.log("value: %s", "ready");
	console.trace("trace message");
	console.debug("debug message");
	console.warn("warning message");
	console.error(error);
	/* eslint-enable no-console */

	expect(info).toHaveBeenCalledWith("value: ready");
	expect(trace).toHaveBeenCalledWith("trace message");
	expect(debug).toHaveBeenCalledWith("debug message");
	expect(warn).toHaveBeenCalledWith("warning message");
	expect(errorLogger).toHaveBeenCalledWith(error, error.message);
});
