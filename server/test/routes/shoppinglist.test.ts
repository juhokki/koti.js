import { vi, expect, test, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import getRouter from "../../src/service/http/routes/index.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type UserService from "../../src/service/user/UserService.js";
import type RecipeService from "../../src/service/recipe/RecipeService.js";
import type ShoppingListService from "../../src/service/shoppinglist/ShoppingListService.js";
import type DataService from "../../src/service/data/DataService.js";
import type HttpServiceSettings from "../../src/service/http/HttpServiceSettings.js";

const mockAddItems = vi.hoisted(() => vi.fn());

const services = new ServiceLocator(
	new Map([
		["DataService", {} as DataService],
		["SystemService", {} as DataService],
		["RecipeService", {} as unknown as RecipeService],
		[
			"UserService",
			{
				verifyJWT: () => ({ username: "test", locale: "fi" })
			} as unknown as UserService
		],
		[
			"ShoppingListService",
			{ addItems: mockAddItems } as unknown as ShoppingListService
		]
	] as [string, ServiceBase][])
);

const settings = { frontend: "/test", port: 0 } satisfies HttpServiceSettings;
const auth = "Bearer token";

function agent() {
	const app = express();
	app.use(getRouter(services, settings));
	return request(app);
}

beforeEach(() => {
	vi.clearAllMocks();
});

test("PATCH /api/shoppinglist requires authentication", async () => {
	const response = await agent()
		.patch("/api/shoppinglist")
		.send({ items: ["milk"] });

	expect(response.status).toBe(401);
});

test("PATCH /api/shoppinglist appends items", async () => {
	const response = await agent()
		.patch("/api/shoppinglist")
		.set("Authorization", auth)
		.send({ items: ["2 dl flour", " milk "] });

	expect(response.status).toBe(204);
	expect(mockAddItems).toHaveBeenCalledWith(["2 dl flour", "milk"]);
});

test.each([
	{},
	{ items: [] },
	{ items: "milk" },
	{ items: [1] },
	{ items: [" "] }
])("PATCH /api/shoppinglist rejects invalid body %j", async (body) => {
	const response = await agent()
		.patch("/api/shoppinglist")
		.set("Authorization", auth)
		.send(body);

	expect(response.status).toBe(400);
	expect(mockAddItems).not.toHaveBeenCalled();
});
