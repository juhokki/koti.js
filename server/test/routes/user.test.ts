import express, { type Request } from "express";
import request from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { expect, test, vi } from "vitest";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import getUserRouter from "../../src/service/http/routes/api/user.js";
import type UserService from "../../src/service/user/UserService.js";

const mockGetSubscriptionStatus = vi.fn();
const mockAddSubscription = vi.fn();
const mockDeleteSubscription = vi.fn();
const user = { username: "test", locale: "fi" };
const services = new ServiceLocator(
	new Map([
		[
			"UserService",
			{
				getUserSubscriptionStatus: mockGetSubscriptionStatus,
				addUserSubscription: mockAddSubscription,
				deleteUserSubscription: mockDeleteSubscription
			} as unknown as UserService
		]
	] as [string, ServiceBase][])
);

function createApp(authenticated = true) {
	const app = express();
	app.use(express.json());
	if (authenticated) {
		app.use((req, _res, next) => {
			Object.assign(req as Request, { user });
			next();
		});
	}
	app.use(getUserRouter(services));
	return app;
}

const subscription = {
	endpoint: "https://push.example/subscription",
	keys: { p256dh: "public-key", auth: "auth-key" }
};

test("Reports whether a web-push subscription exists", async () => {
	const app = createApp();
	mockGetSubscriptionStatus.mockReturnValueOnce(true);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.put("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual({ status: true });
	expect(mockGetSubscriptionStatus).toHaveBeenCalledWith(
		user.username,
		subscription
	);
});

test("Returns an error when checking a subscription fails", async () => {
	const app = createApp();
	mockGetSubscriptionStatus.mockImplementationOnce(() => {
		throw new Error("User not found");
	});

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.put("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(500);
});

test("Adds a web-push subscription", async () => {
	const app = createApp();

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(200);
	expect(mockAddSubscription).toHaveBeenCalledWith(
		user.username,
		subscription
	);
});

test("Returns an error when adding a subscription fails", async () => {
	const app = createApp();
	mockAddSubscription.mockImplementationOnce(() => {
		throw new Error("User not found");
	});

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(500);
});

test("Deletes a web-push subscription", async () => {
	const app = createApp();

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.delete("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(200);
	expect(mockDeleteSubscription).toHaveBeenCalledWith(
		user.username,
		subscription
	);
});

test("Returns an error when deleting a subscription fails", async () => {
	const app = createApp();
	mockDeleteSubscription.mockImplementationOnce(() => {
		throw new Error("User not found");
	});

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.delete("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(500);
});

test("Rejects requests without an authenticated user", async () => {
	const app = createApp(false);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.put("/user/web-push")
		.send(subscription);

	expect(response.status).toBe(500);
});