import { vi, expect, test } from "vitest";
import request from "supertest";
import express from "express";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import getRouter from "../../src/service/http/routes/index.js";
import ServiceBase from "../../src/service/ServiceBase.js";
import type IntegrationService from "../../src/service/integration/IntegrationService.js";
import type UserService from "../../src/service/user/UserService.js";
import type HttpServiceSettings from "../../src/service/http/HttpServiceSettings.js";
import type TestAgent from "supertest/lib/agent.js";
import type UserPayload from "../../src/service/user/UserPayload.js";
import type DataService from "../../src/service/data/DataService.js";

const mockVerifyBasic = vi.hoisted(() => vi.fn());
const mockVerifyJwt = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());

const services = new ServiceLocator(
	new Map([
		["DataService", {} as DataService],
		["SystemService", {} as DataService],
		[
			"UserService",
			{
				verifyBasic: mockVerifyBasic,
				verifyJWT: mockVerifyJwt
			} as unknown as UserService
		],
		[
			"IntegrationService",
			{
				get: () => ({
					write: mockWrite
				})
			} as unknown as IntegrationService
		]
	] as [string, ServiceBase][])
);

const settings = {
	frontend: "/test",
	port: 0
} satisfies HttpServiceSettings;

test("Responds with 401 when no authentication", async () => {
	const app = express();

	app.use(getRouter(services, settings));

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/api/values")
		.send([]);

	expect(response.status).toBe(401);
});

test("Responds with 200 when using basic authentication", async () => {
	const username = "test";
	const password = "password";
	const locale = "fi";
	const app = express();

	app.use(getRouter(services, settings));

	mockWrite.mockReturnValue(Promise.resolve());
	mockVerifyBasic.mockReturnValue({ username, locale } satisfies UserPayload);

	const auth = `Basic ${Buffer.from(username + ":" + password).toString("base64")}`;

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/api/values")
		.set("Authorization", auth)
		.send([]);

	expect(mockVerifyBasic).toHaveBeenCalledWith(username, password);
	expect(response.status).toBe(200);
});

test("Responds with 200 when using bearer authentication", async () => {
	const username = "test";
	const token = "test-token";
	const locale = "fi";
	const app = express();

	app.use(getRouter(services, settings));

	mockWrite.mockReturnValue(Promise.resolve());
	mockVerifyJwt.mockReturnValue(
		Promise.resolve({ username, locale } satisfies UserPayload)
	);

	const auth = `Bearer ${token}`;

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/api/values")
		.set("Authorization", auth)
		.send([]);

	expect(response.status).toBe(200);
});
