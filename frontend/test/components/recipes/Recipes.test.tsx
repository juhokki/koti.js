import { vi, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RecipeList from "../../../src/components/recipes/RecipeList";
import RecipeDetails from "../../../src/components/recipes/RecipeDetails";
import RecipeDelete from "../../../src/components/recipes/RecipeDelete";
import RecipeEdit from "../../../src/components/recipes/RecipeEdit";
import { UserContext } from "../../../src/context/UserContext";
import RecipesApi from "../../../src/api/RecipesApi";

afterEach(cleanup);

const recipe = {
	id: "1",
	title: "Pancakes",
	ingredients: [{ amount: "2", unit: "dl", name: "flour" }],
	steps: ["Mix", "Fry"],
	owner: "alice"
};

vi.mock("../../../src/api/RecipesApi", () => ({
	default: {
		getRecipes: () => Promise.resolve([recipe]),
		getRecipe: () => Promise.resolve(recipe),
		createRecipe: vi.fn(),
		updateRecipe: vi.fn(),
		deleteRecipe: vi.fn(() => Promise.resolve())
	}
}));

it("Renders recipe list with new recipe button", async () => {
	render(
		<MemoryRouter>
			<RecipeList />
		</MemoryRouter>
	);

	expect(await screen.findByText("Pancakes")).toBeTruthy();
	expect(screen.getByText("alice")).toBeTruthy();
	expect(screen.getByText("Uusi resepti")).toBeTruthy();
});

it("Shows recipe edit and delete buttons to the owner", async () => {
	render(
		<UserContext.Provider
			value={{
				user: { username: "alice", locale: "fi" },
				setUser: vi.fn()
			}}
		>
			<MemoryRouter initialEntries={["/recipes/1"]}>
				<Routes>
					<Route
						path="/recipes/:recipeId"
						element={<RecipeDetails />}
					/>
				</Routes>
			</MemoryRouter>
		</UserContext.Provider>
	);

	expect(await screen.findByText("2 dl flour")).toBeTruthy();
	expect(screen.getByText("Fry")).toBeTruthy();
	expect(screen.getByText("Muokkaa")).toBeTruthy();
	expect(screen.getByText("Poista")).toBeTruthy();
});

it("Deletes a recipe after confirmation", async () => {
	vi.clearAllMocks();
	render(
		<MemoryRouter initialEntries={["/recipes/1/delete"]}>
			<Routes>
				<Route
					path="/recipes/:recipeId/delete"
					element={<RecipeDelete />}
				/>
				<Route path="/recipes" element={<p>Recipe list</p>} />
			</Routes>
		</MemoryRouter>
	);

	expect(
		await screen.findByText("Haluatko varmasti poistaa reseptin Pancakes?")
	).toBeTruthy();
	expect(vi.mocked(RecipesApi).deleteRecipe.mock.calls).toHaveLength(0);

	fireEvent.click(screen.getByRole("button", { name: "Poista" }));

	expect(await screen.findByText("Recipe list")).toBeTruthy();
	expect(vi.mocked(RecipesApi).deleteRecipe.mock.calls).toEqual([["1"]]);
});

it("Hides recipe edit and delete buttons from other users", async () => {
	render(
		<UserContext.Provider
			value={{
				user: { username: "bob", locale: "fi" },
				setUser: vi.fn()
			}}
		>
			<MemoryRouter initialEntries={["/recipes/1"]}>
				<Routes>
					<Route
						path="/recipes/:recipeId"
						element={<RecipeDetails />}
					/>
				</Routes>
			</MemoryRouter>
		</UserContext.Provider>
	);

	expect(await screen.findByText("2 dl flour")).toBeTruthy();
	expect(screen.queryByText("Muokkaa")).toBeNull();
	expect(screen.queryByText("Poista")).toBeNull();
});

it("Renders recipe edit form", async () => {
	render(
		<MemoryRouter initialEntries={["/recipes/1/edit"]}>
			<Routes>
				<Route
					path="/recipes/:recipeId/edit"
					element={<RecipeEdit />}
				/>
			</Routes>
		</MemoryRouter>
	);

	expect(await screen.findByDisplayValue("Pancakes")).toBeTruthy();
	expect(screen.getByText("Tallenna")).toBeTruthy();
});
