import { expect, test } from "vitest";
import { LogBuffer } from "../src/util/LogBuffer.js";
import { readLogs } from "../src/util/LogUtil.js";

function createBuffer() {
	const buffer = new LogBuffer(10);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 50, time: 2, msg: "b" });
	buffer.add({ level: 40, time: 3, msg: "c" });
	return buffer;
}

test("Returns newest first and pages", () => {
	const result = readLogs(
		{ start: 1, limit: 1, minLevel: 0 },
		createBuffer()
	);

	expect(result.total).toBe(3);
	expect(result.entries.map((e) => e.msg)).toStrictEqual(["b"]);
});

test("Filters by minimum level", () => {
	const result = readLogs(
		{ start: 0, limit: 10, minLevel: 40 },
		createBuffer()
	);

	expect(result.entries.map((e) => e.msg)).toStrictEqual(["c", "b"]);
});

test("Returns empty result when buffer is empty", () => {
	const result = readLogs(
		{ start: 0, limit: 10, minLevel: 0 },
		new LogBuffer()
	);

	expect(result).toStrictEqual({
		total: 0,
		start: 0,
		limit: 10,
		entries: []
	});
});

test("Drops oldest entries when capacity is exceeded", () => {
	const buffer = new LogBuffer(2);
	buffer.add({ level: 30, time: 1, msg: "a" });
	buffer.add({ level: 30, time: 2, msg: "b" });
	buffer.add({ level: 30, time: 3, msg: "c" });

	expect(buffer.getAll().map((e) => e.msg)).toStrictEqual(["b", "c"]);
});

test("Parses NDJSON written by pino and ignores invalid chunks", () => {
	const buffer = new LogBuffer();
	buffer.write('{"level":30,"time":1,"msg":"ok"}\n');
	buffer.write("not json");

	expect(buffer.getAll()).toHaveLength(1);
});
