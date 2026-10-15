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

const page = { total: 0, start: 0, limit: 100, entries: [] };

beforeEach(() => {
	mockReadLogs.mockReset();
	mockReadLogs.mockReturnValue(page);
});

function createApp() {
	const app = express();
	app.use(getLogsRouter());
	return app;
}

test("Uses default paging and level", async () => {
	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get("/logs");

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual(page);
	expect(mockReadLogs).toHaveBeenCalledWith({
		start: 0,
		limit: 100,
		minLevel: 10
	});
});

test("Passes start, limit and level", async () => {
	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get(
		"/logs?start=5&limit=10&level=warn"
	);

	expect(response.status).toBe(200);
	expect(mockReadLogs).toHaveBeenCalledWith({
		start: 5,
		limit: 10,
		minLevel: 40
	});
});

test.each(["start=-1", "start=abc", "limit=0", "limit=1001", "level=loud"])(
	"Responds with 400 for invalid query %s",
	async (query) => {
		// eslint-disable-next-line
		const response = await (request(createApp()) as TestAgent).get(
			`/logs?${query}`
		);

		expect(response.status).toBe(400);
		expect(mockReadLogs).not.toHaveBeenCalled();
	}
);

test("Responds with 500 when reading fails", async () => {
	mockReadLogs.mockImplementation(() => {
		throw new Error("fail");
	});

	// eslint-disable-next-line
	const response = await (request(createApp()) as TestAgent).get("/logs");

	expect(response.status).toBe(500);
});
