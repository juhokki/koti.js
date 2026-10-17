import { vi, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RecipeShoppingList from "../../../src/components/recipes/RecipeShoppingList";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const recipe = {
	id: "1",
	title: "Pancakes",
	ingredients: [
		{ amount: "2", unit: "dl", name: "flour" },
		{ amount: "1", unit: "kpl", name: "egg" }
	],
	steps: ["Mix"],
	owner: "alice"
};

const mockAppendItems = vi.hoisted(() => vi.fn());

vi.mock("../../../src/api/RecipesApi", () => ({
	default: { getRecipe: () => Promise.resolve(recipe) }
}));

vi.mock("../../../src/api/ShoppingListApi", () => ({
	default: { appendItems: mockAppendItems }
}));

function renderPage() {
	render(
		<MemoryRouter initialEntries={["/recipes/1/shoppinglist"]}>
			<Routes>
				<Route
					path="/recipes/:recipeId/shoppinglist"
					element={<RecipeShoppingList />}
				/>
				<Route path="/recipes/:recipeId" element={<p>details</p>} />
			</Routes>
		</MemoryRouter>
	);
}

it("Selects all ingredients by default", async () => {
	renderPage();

	await screen.findByText("2 dl flour");

	const boxes = screen.getAllByRole<HTMLInputElement>("checkbox");

	expect(boxes).toHaveLength(2);
	expect(boxes.every((b) => b.checked)).toBe(true);
});

it("Sends only selected ingredients", async () => {
	mockAppendItems.mockResolvedValue(undefined);
	renderPage();

	await screen.findByText("2 dl flour");
	fireEvent.click(screen.getAllByRole("checkbox")[1] as HTMLElement);
	fireEvent.click(screen.getByText("Lisää"));

	expect(mockAppendItems).toHaveBeenCalledWith(["2 dl flour"]);
	expect(await screen.findByText("details")).toBeTruthy();
});

it("Cancel adds nothing and returns to the recipe", async () => {
	renderPage();

	await screen.findByText("2 dl flour");
	fireEvent.click(screen.getByText("Peruuta"));

	expect(mockAppendItems).not.toHaveBeenCalled();
	expect(await screen.findByText("details")).toBeTruthy();
});
