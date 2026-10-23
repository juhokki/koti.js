import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RecipeEdit from "../../../src/components/recipes/RecipeEdit";

const mockGetRecipe = vi.hoisted(() => vi.fn());
const mockCreateRecipe = vi.hoisted(() => vi.fn());
const mockUpdateRecipe = vi.hoisted(() => vi.fn());

vi.mock("../../../src/api/RecipesApi", () => ({
	default: {
		getRecipe: mockGetRecipe,
		createRecipe: mockCreateRecipe,
		updateRecipe: mockUpdateRecipe
	}
}));

const savedRecipe = {
	id: "recipe-1",
	title: "Soup",
	ingredients: [{ amount: "1", unit: "l", name: "water" }],
	steps: ["Boil"]
};

function renderEditor(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/recipes/new" element={<RecipeEdit />} />
				<Route path="/recipes/:recipeId/edit" element={<RecipeEdit />} />
				<Route path="/recipes/:recipeId" element={<p>Recipe saved</p>} />
			</Routes>
		</MemoryRouter>
	);
}

beforeEach(() => {
	mockGetRecipe.mockReset();
	mockCreateRecipe.mockReset();
	mockUpdateRecipe.mockReset();
});

afterEach(cleanup);

test("Creates a recipe and excludes blank ingredients and steps", async () => {
	mockCreateRecipe.mockResolvedValueOnce(savedRecipe);
	renderEditor("/recipes/new");

	fireEvent.change(screen.getByPlaceholderText("Reseptin nimi"), {
		target: { value: "  Pancakes  " }
	});
	fireEvent.change(screen.getByPlaceholderText("Määrä"), {
		target: { value: " 2 " }
	});
	fireEvent.change(screen.getByPlaceholderText("Ainesosa"), {
		target: { value: " flour " }
	});
	fireEvent.change(screen.getByPlaceholderText("Vaihe"), {
		target: { value: " Mix " }
	});
	fireEvent.click(screen.getByRole("button", { name: "Lisää ainesosa" }));
	fireEvent.click(screen.getByRole("button", { name: "Lisää vaihe" }));

	const title = screen.getByPlaceholderText("Reseptin nimi");
	const form = title.closest("form");
	expect(form).not.toBeNull();
	if (form) {
		fireEvent.submit(form);
	}

	expect(await screen.findByText("Recipe saved")).toBeTruthy();
	expect(mockCreateRecipe).toHaveBeenCalledWith({
		title: "Pancakes",
		ingredients: [{ amount: "2", unit: "", name: "flour" }],
		steps: ["Mix"]
	});
});

test("Loads and updates an existing recipe", async () => {
	mockGetRecipe.mockResolvedValueOnce({
		...savedRecipe,
		ingredients: [],
		steps: []
	});
	mockUpdateRecipe.mockResolvedValueOnce(savedRecipe);
	renderEditor("/recipes/recipe-1/edit");

	expect(await screen.findByDisplayValue("Soup")).toBeTruthy();
	expect(screen.getByPlaceholderText("Ainesosa")).toBeTruthy();
	expect(screen.getByPlaceholderText("Vaihe")).toBeTruthy();
	fireEvent.change(screen.getByPlaceholderText("Reseptin nimi"), {
		target: { value: "New soup" }
	});
	const title = screen.getByPlaceholderText("Reseptin nimi");
	const form = title.closest("form");
	if (form) {
		fireEvent.submit(form);
	}

	expect(await screen.findByText("Recipe saved")).toBeTruthy();
	expect(mockUpdateRecipe).toHaveBeenCalledWith("recipe-1", {
		title: "New soup",
		ingredients: [],
		steps: []
	});
});

test("Shows the error state when loading or saving fails", async () => {
	mockGetRecipe.mockRejectedValueOnce(new Error("Not found"));
	renderEditor("/recipes/missing/edit");
	expect(await screen.findByText("Tallennus epäonnistui.")).toBeTruthy();

	cleanup();
	mockCreateRecipe.mockRejectedValueOnce(new Error("Offline"));
	renderEditor("/recipes/new");
	fireEvent.change(screen.getByPlaceholderText("Reseptin nimi"), {
		target: { value: "Soup" }
	});
	const title = screen.getByPlaceholderText("Reseptin nimi");
	const form = title.closest("form");
	if (form) {
		fireEvent.submit(form);
	}

	expect(await screen.findByText("Tallennus epäonnistui.")).toBeTruthy();
});