import { vi, expect, test } from "vitest";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import getLoginRouter from "../../src/service/http/routes/login/index.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type UserService from "../../src/service/user/UserService.js";
import type TestAgent from "supertest/lib/agent.js";

const mockAuthenticate = vi.hoisted(() => vi.fn());

const services = new ServiceLocator(
	new Map([
		[
			"UserService",
			{
				authenticate: mockAuthenticate
			} as unknown as UserService
		]
	] as [string, ServiceBase][])
);

test("Authenticates user and responds with token", async () => {
	const app = express();
	const username = "test";
	const password = "password";
	const token = "test-token";

	app.use(bodyParser.json());
	app.use(getLoginRouter(services));

	mockAuthenticate.mockReturnValueOnce(token);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/")
		.send({ username, password })
		.set("Accept", "application/json");

	expect(mockAuthenticate).toHaveBeenCalledWith(username, password);
	expect(response.status).toBe(200);
	expect(response.text).toBe(token);
});
