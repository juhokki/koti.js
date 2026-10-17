import { vi, expect, test, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import getRouter from "../../src/service/http/routes/index.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type UserService from "../../src/service/user/UserService.js";
import type RecipeService from "../../src/service/recipe/RecipeService.js";
import type DataService from "../../src/service/data/DataService.js";
import type HttpServiceSettings from "../../src/service/http/HttpServiceSettings.js";

const mockGetAll = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

const services = new ServiceLocator(
	new Map([
		["DataService", {} as DataService],
		["SystemService", {} as DataService],
		[
			"UserService",
			{
				verifyJWT: () => ({ username: "test", locale: "fi" })
			} as unknown as UserService
		],
		[
			"RecipeService",
			{
				getAll: mockGetAll,
				get: mockGet,
				create: mockCreate,
				update: mockUpdate,
				delete: mockDelete
			} as unknown as RecipeService
		]
	] as [string, ServiceBase][])
);

const settings = { frontend: "/test", port: 0 } satisfies HttpServiceSettings;
const auth = "Bearer token";
const validRecipe = {
	title: "Soup",
	ingredients: [{ amount: "1", unit: "l", name: "water" }],
	steps: ["Boil"]
};
const storedRecipe = { id: "1", ...validRecipe, owner: "test" };

function agent() {
	const app = express();
	app.use(getRouter(services, settings));
	return request(app);
}

beforeEach(() => {
	vi.clearAllMocks();
});

test("Recipes require authentication", async () => {
	const response = await agent().get("/api/recipes");
	expect(response.status).toBe(401);
});

test("GET /api/recipes lists recipes", async () => {
	mockGetAll.mockReturnValue([{ id: "1", ...validRecipe }]);

	const response = await agent()
		.get("/api/recipes")
		.set("Authorization", auth);

	expect(response.status).toBe(200);
	expect(response.body).toHaveLength(1);
});

test("GET /api/recipes/:id returns 404 when missing", async () => {
	mockGet.mockReturnValue(undefined);

	const response = await agent()
		.get("/api/recipes/x")
		.set("Authorization", auth);

	expect(response.status).toBe(404);
});

test("POST /api/recipes creates a recipe", async () => {
	mockCreate.mockReturnValue(storedRecipe);

	const response = await agent()
		.post("/api/recipes")
		.set("Authorization", auth)
		.send(validRecipe);

	expect(response.status).toBe(201);
	expect(mockCreate).toHaveBeenCalledWith(validRecipe, "test");
});

test("POST /api/recipes rejects invalid recipe", async () => {
	const response = await agent()
		.post("/api/recipes")
		.set("Authorization", auth)
		.send({ ...validRecipe, title: "" });

	expect(response.status).toBe(400);
	expect(mockCreate).not.toHaveBeenCalled();
});

test("PUT /api/recipes/:id updates or returns 404", async () => {
	mockGet.mockReturnValueOnce(storedRecipe).mockReturnValueOnce(undefined);
	mockUpdate.mockReturnValue(storedRecipe);

	const ok = await agent()
		.put("/api/recipes/1")
		.set("Authorization", auth)
		.send(validRecipe);
	const missing = await agent()
		.put("/api/recipes/2")
		.set("Authorization", auth)
		.send(validRecipe);

	expect(ok.status).toBe(200);
	expect(missing.status).toBe(404);
});

test("PUT /api/recipes/:id rejects non-owners", async () => {
	mockGet.mockReturnValue({ ...storedRecipe, owner: "other" });

	const response = await agent()
		.put("/api/recipes/1")
		.set("Authorization", auth)
		.send(validRecipe);

	expect(response.status).toBe(403);
	expect(mockUpdate).not.toHaveBeenCalled();
});

test("DELETE /api/recipes/:id deletes or returns 404", async () => {
	mockGet.mockReturnValueOnce(storedRecipe).mockReturnValueOnce(undefined);
	mockDelete.mockReturnValueOnce(true);
	mockDelete.mockReturnValueOnce(false);

	const ok = await agent()
		.delete("/api/recipes/1")
		.set("Authorization", auth);
	const missing = await agent()
		.delete("/api/recipes/2")
		.set("Authorization", auth);

	expect(ok.status).toBe(204);
	expect(missing.status).toBe(404);
});

test("DELETE /api/recipes/:id rejects non-owners", async () => {
	mockGet.mockReturnValue({ ...storedRecipe, owner: "other" });

	const response = await agent()
		.delete("/api/recipes/1")
		.set("Authorization", auth);

	expect(response.status).toBe(403);
	expect(mockDelete).not.toHaveBeenCalled();
});
