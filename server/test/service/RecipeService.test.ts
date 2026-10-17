import { expect, vi, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import RecipeService from "../../src/service/recipe/RecipeService.js";
import type RecipeServiceSettings from "../../src/service/recipe/RecipeServiceSettings.js";

const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
	writeFileSync: mockWriteFileSync,
	readFileSync: mockReadFileSync
}));

const services = new ServiceLocator();
const settings = { file: "recipes.json" } satisfies RecipeServiceSettings;

const existing = {
	id: "1",
	title: "Pancakes",
	ingredients: [{ amount: "2", unit: "dl", name: "flour" }],
	steps: ["Mix", "Fry"],
	owner: "alice"
};

function createService() {
	mockReadFileSync.mockReturnValueOnce(
		JSON.stringify({ recipes: [existing] })
	);

	return new RecipeService(services, settings);
}

test("Recipes are read from file", () => {
	const service = createService();

	expect(service.getAll()).toHaveLength(1);
	expect(service.get("1")?.title).toBe("Pancakes");
	expect(service.get("missing")).toBeUndefined();
});

test("Recipe is created and written to file", () => {
	const service = createService();
	const recipe = service.create(
		{
			title: "Soup",
			ingredients: [],
			steps: ["Boil"]
		},
		"alice"
	);

	expect(recipe.id).toBeTruthy();
	expect(service.getAll()).toHaveLength(2);
	expect(mockWriteFileSync).toHaveBeenCalledWith(
		settings.file,
		expect.stringContaining("Soup")
	);
});

test("Recipe is updated", () => {
	const service = createService();
	const updated = service.update("1", {
		title: "Crepes",
		ingredients: [],
		steps: []
	});

	expect(updated).toEqual({
		id: "1",
		title: "Crepes",
		ingredients: [],
		steps: [],
		owner: "alice"
	});
	expect(
		service.update("missing", { title: "x", ingredients: [], steps: [] })
	).toBeUndefined();
});

test("Recipe is deleted", () => {
	const service = createService();

	expect(service.delete("1")).toBe(true);
	expect(service.delete("1")).toBe(false);
	expect(service.getAll()).toHaveLength(0);
});
