import { afterEach, beforeEach, expect, test, vi } from "vitest";
import LoginApi from "../../src/api/LoginApi";
import LogsApi from "../../src/api/LogsApi";
import RecipesApi from "../../src/api/RecipesApi";
import ShoppingListApi from "../../src/api/ShoppingListApi";
import SystemApi from "../../src/api/SystemApi";
import ValuesApi from "../../src/api/ValuesApi";
import WebPushApi from "../../src/api/WebPushApi";
import type { RecipeInput } from "../../src/interface/Recipe";

const mockFetch = vi.fn();

function createResponse(body: unknown, status = 200): Response {
	return {
		status,
		ok: status >= 200 && status < 300,
		json: vi.fn().mockResolvedValue(body),
		text: vi
			.fn()
			.mockResolvedValue(
				typeof body === "string" ? body : JSON.stringify(body)
			)
	} as unknown as Response;
}

beforeEach(() => {
	localStorage.clear();
	localStorage.setItem("jwt", "test-token");
	vi.stubGlobal("fetch", mockFetch);
	mockFetch.mockReset();
});

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
});

test("LoginApi sends credentials and returns the token", async () => {
	mockFetch.mockResolvedValueOnce(createResponse("signed-token"));

	await expect(LoginApi.login("alice", "secret")).resolves.toBe(
		"signed-token"
	);
	expect(mockFetch).toHaveBeenCalledWith("/user/login", {
		method: "POST",
		body: JSON.stringify({ username: "alice", password: "secret" }),
		headers: { "Content-Type": "application/json" }
	});
});

test("LoginApi rejects non-200 responses", async () => {
	mockFetch.mockResolvedValueOnce(createResponse("", 401));

	await expect(LoginApi.login("alice", "wrong")).rejects.toThrow(
		"Login failed"
	);
});

test("LogsApi serializes filters and parses the log page", async () => {
	const page = { entries: [{ level: 50, time: 100, msg: "failure" }] };
	mockFetch.mockResolvedValueOnce(createResponse(page));

	await expect(LogsApi.getLogs(10, 20, ["error", "warn"])).resolves.toEqual(
		page
	);
	expect(mockFetch).toHaveBeenCalledWith(
		"/api/logs?start=10&end=20&level=error&level=warn",
		expect.objectContaining({
			method: "GET",
			headers: { Authorization: "Bearer test-token" }
		})
	);
});

test("LogsApi rejects unsuccessful responses", async () => {
	mockFetch.mockResolvedValueOnce(createResponse({}, 503));

	await expect(LogsApi.getLogs(0, 1, [])).rejects.toThrow(
		"Failed to fetch logs: 503"
	);
});

test("RecipesApi covers list, detail, create, update, and delete requests", async () => {
	const recipe = {
		id: "recipe-1",
		title: "Soup",
		ingredients: [],
		steps: []
	};
	const input: RecipeInput = {
		title: "Soup",
		ingredients: [{ amount: "1", unit: "l", name: "water" }],
		steps: ["Boil"]
	};
	mockFetch.mockResolvedValue(createResponse(recipe));

	await expect(RecipesApi.getRecipes()).resolves.toEqual(recipe);
	await expect(RecipesApi.getRecipe("recipe / one")).resolves.toEqual(recipe);
	await expect(RecipesApi.createRecipe(input)).resolves.toEqual(recipe);
	await expect(
		RecipesApi.updateRecipe("recipe / one", input)
	).resolves.toEqual(recipe);
	await expect(RecipesApi.deleteRecipe("recipe / one")).resolves.toBeUndefined();

	expect(mockFetch).toHaveBeenNthCalledWith(
		1,
		"/api/recipes",
		expect.objectContaining({ method: "GET", body: undefined })
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		2,
		"/api/recipes/recipe%20%2F%20one",
		expect.objectContaining({ method: "GET", body: undefined })
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		3,
		"/api/recipes",
		expect.objectContaining({
			method: "POST",
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(input)
		})
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		4,
		"/api/recipes/recipe%20%2F%20one",
		expect.objectContaining({ method: "PUT", body: JSON.stringify(input) })
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		5,
		"/api/recipes/recipe%20%2F%20one",
		expect.objectContaining({ method: "DELETE", body: undefined })
	);
});

test("RecipesApi reports unsuccessful requests", async () => {
	mockFetch.mockResolvedValueOnce(createResponse({}, 404));

	await expect(RecipesApi.getRecipes()).rejects.toThrow(
		"Recipe request failed: GET /api/recipes 404"
	);
});

test("ShoppingListApi appends items and rejects failed requests", async () => {
	mockFetch
		.mockResolvedValueOnce(createResponse({}, 200))
		.mockResolvedValueOnce(createResponse({}, 500));
	const items = ["Milk", "Bread"];

	await expect(ShoppingListApi.appendItems(items)).resolves.toBeUndefined();
	expect(mockFetch).toHaveBeenNthCalledWith(
		1,
		"/api/shoppinglist",
		expect.objectContaining({
			method: "PATCH",
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ items })
		})
	);
	await expect(ShoppingListApi.appendItems(items)).rejects.toThrow(
		"Shopping list request failed: 500"
	);
});

test("SystemApi fetches stats and URL-encodes integration names", async () => {
	const stats = { uptime: 100 };
	const integration = { name: "Shelly Integration", parameters: [] };
	mockFetch
		.mockResolvedValueOnce(createResponse(stats))
		.mockResolvedValueOnce(createResponse(integration));

	await expect(SystemApi.getSystemStats()).resolves.toEqual(stats);
	await expect(SystemApi.getIntegration("Shelly Integration")).resolves.toEqual(
		integration
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		1,
		"/api/system",
		expect.objectContaining({ method: "GET" })
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		2,
		"/api/system/integration?name=Shelly%20Integration",
		expect.objectContaining({ method: "GET" })
	);
});

test("SystemApi reports failed integration requests", async () => {
	mockFetch.mockResolvedValueOnce(createResponse({}, 404));

	await expect(SystemApi.getIntegration("missing")).rejects.toThrow(
		"Request failed with status 404"
	);
});

test("ValuesApi sends controls and fetches a device time range", async () => {
	const values = [{ deviceId: "device-1", measurementId: "temp", value: 20 }];
	mockFetch
		.mockResolvedValueOnce(createResponse({}))
		.mockResolvedValueOnce(createResponse(values));

	await ValuesApi.control("device-1", "relay0", true);
	await expect(
		ValuesApi.getDeviceValues("device-1", 100, 200)
	).resolves.toEqual(values);
	expect(mockFetch).toHaveBeenNthCalledWith(
		1,
		"/api/values",
		expect.objectContaining({
			method: "PUT",
			body: JSON.stringify({
				deviceId: "device-1",
				measurementId: "relay0",
				value: true
			})
		})
	);
	expect(mockFetch).toHaveBeenNthCalledWith(
		2,
		"/api/values/device-1?startTime=100&endTime=200",
		expect.objectContaining({ method: "GET" })
	);
});

test("WebPushApi checks, subscribes, and cancels subscriptions", async () => {
	const subscription = {
		endpoint: "https://push.example/endpoint",
		keys: { p256dh: "public", auth: "secret" }
	} as PushSubscription;
	const status = { status: true };
	mockFetch
		.mockResolvedValueOnce(createResponse(status))
		.mockResolvedValueOnce(createResponse({}, 200))
		.mockResolvedValueOnce(createResponse({}, 200));

	await expect(WebPushApi.checkSubscription(subscription)).resolves.toEqual(
		status
	);
	await expect(WebPushApi.subscribe(subscription)).resolves.toBeUndefined();
	await expect(WebPushApi.cancelSubscription(subscription)).resolves.toBeUndefined();
	for (const method of ["PUT", "POST", "DELETE"]) {
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/user/web-push",
			expect.objectContaining({
				method,
				headers: {
					Authorization: "Bearer test-token",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(subscription)
			})
		);
	}
});

test.each([
	["subscribe", 500, "Failed to subscribe"],
	["cancel", 500, "Failed to cancel subscription"]
])("WebPushApi %s reports non-200 responses", async (action, status, message) => {
	mockFetch.mockResolvedValueOnce(createResponse({}, status));
	const subscription = {
		endpoint: "https://push.example/endpoint",
		keys: { p256dh: "public", auth: "secret" }
	} as PushSubscription;
	const request =
		action === "subscribe"
			? WebPushApi.subscribe(subscription)
			: WebPushApi.cancelSubscription(subscription);

	await expect(request).rejects.toThrow(message);
});