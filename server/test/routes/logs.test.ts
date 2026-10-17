import { vi, expect, test, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import getLogsRouter from "../../src/service/http/routes/api/logs.js";
import type TestAgent from "supertest/lib/agent.js";

const mockReadLogs = vi.hoisted(() => vi.fn());

vi.mock("../../src/util/LogUtil.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../src/util/LogUtil.js")>()),
	readLogs: mockReadLogs
}));

const page = { entries: [] };

beforeEach(() => {
	mockReadLogs.mockReset();
	mockReadLogs.mockReturnValue(page);
});

function createApp() {
	const app = express();
	app.use(getLogsRouter());
	return app;
}

test("Passes start, end and default level", async () => {
	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get(
		"/logs?start=5&end=10"
	);

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual(page);
	expect(mockReadLogs).toHaveBeenCalledWith({
		start: 5,
		end: 10,
		minLevel: 10
	});
});

test("Passes level", async () => {
	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get(
		"/logs?start=5&end=10&level=warn"
	);

	expect(response.status).toBe(200);
	expect(mockReadLogs).toHaveBeenCalledWith({
		start: 5,
		end: 10,
		minLevel: 40
	});
});

test.each([
	"",
	"start=5",
	"end=5",
	"start=-1&end=5",
	"start=abc&end=5",
	"start=10&end=5",
	"start=1&end=5&level=loud"
])("Responds with 400 for invalid query %s", async (query) => {
	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get(
		`/logs?${query}`
	);

	expect(response.status).toBe(400);
	expect(mockReadLogs).not.toHaveBeenCalled();
});

test("Responds with 500 when reading fails", async () => {
	mockReadLogs.mockImplementation(() => {
		throw new Error("fail");
	});

	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get(
		"/logs?start=1&end=2"
	);

	expect(response.status).toBe(500);
});
