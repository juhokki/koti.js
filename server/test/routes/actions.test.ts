import bodyParser from "body-parser";
import express from "express";
import request from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { beforeEach, expect, test, vi } from "vitest";
import type ActionService from "../../src/service/action/ActionService.js";
import getApiRouter from "../../src/service/http/routes/api/actions.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";

const mockExecuteAction = vi.fn();

const services = new ServiceLocator(
	new Map([
		[
			"ActionService",
			{ executeAction: mockExecuteAction } as unknown as ActionService
		]
	] as [string, ServiceBase][])
);

const app = express();
app.use(bodyParser.json());
app.use(getApiRouter(services));

const body = {
	deviceId: "device-1",
	measurementId: "id",
	name: "test",
	trigger: "onChange"
};

beforeEach(() => {
	mockExecuteAction.mockReset();
});

test("Executes an action", async () => {
	mockExecuteAction.mockReturnValueOnce(true);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/actions/execute")
		.send(body);

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual({ ok: true });
	expect(mockExecuteAction).toHaveBeenCalledWith(
		"device-1",
		"id",
		"test",
		"onChange"
	);
});

test("Rejects an invalid body", async () => {
	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/actions/execute")
		.send({ deviceId: "device-1" });

	expect(response.status).toBe(400);
});

test("Returns 404 for an unknown action", async () => {
	mockExecuteAction.mockReturnValueOnce(false);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/actions/execute")
		.send(body);

	expect(response.status).toBe(404);
});

test("Returns the script error message", async () => {
	mockExecuteAction.mockImplementationOnce(() => {
		throw new Error("boom");
	});

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/actions/execute")
		.send(body);

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual({ ok: false, error: "boom" });
});
