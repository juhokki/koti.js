import { expect, test } from "vitest";
import { LogBuffer, logBuffer } from "../src/util/LogBuffer.js";
import { readLogs } from "../src/util/LogUtil.js";
import logger from "../src/util/logger.js";

function createBuffer() {
	const buffer = new LogBuffer(10);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 50, time: 2, msg: "b" });
	buffer.add({ level: 40, time: 3, msg: "c" });
	return buffer;
}

test("Returns newest first", () => {
	const result = readLogs({ start: 0, end: 10, minLevel: 0 }, createBuffer());

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["c", "b", "a"]);
});

test("Filters by time window", () => {
	const result = readLogs({ start: 2, end: 2, minLevel: 0 }, createBuffer());

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["b"]);
});

test("Filters by minimum level", () => {
	const result = readLogs(
		{ start: 0, end: 10, minLevel: 40 },
		createBuffer()
	);

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["c", "b"]);
});

test("Returns empty result when buffer is empty", () => {
	const result = readLogs(
		{ start: 0, end: 10, minLevel: 0 },
		new LogBuffer()
	);

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
