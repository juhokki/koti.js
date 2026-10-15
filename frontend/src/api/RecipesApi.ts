import { Recipe, RecipeInput } from "../interface/Recipe";
import AuthUtil from "../util/AuthUtil";

class RecipesApi {
	private async request(
		url: string,
		method: string,
		body?: RecipeInput
	): Promise<Response> {
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				...(body ? { "Content-Type": "application/json" } : {})
			},
			body: body ? JSON.stringify(body) : undefined
		});

		if (!response.ok) {
			throw new Error(
				`Recipe request failed: ${method} ${url} ${String(response.status)}`
			);
		}

		return response;
	}

	async getRecipes(): Promise<Recipe[]> {
		const response = await this.request("/api/recipes", "GET");
		return (await response.json()) as Recipe[];
	}

	async getRecipe(id: string): Promise<Recipe> {
		const response = await this.request(
			`/api/recipes/${encodeURIComponent(id)}`,
			"GET"
		);
		return (await response.json()) as Recipe;
	}

	async createRecipe(recipe: RecipeInput): Promise<Recipe> {
		const response = await this.request("/api/recipes", "POST", recipe);
		return (await response.json()) as Recipe;
	}

	async updateRecipe(id: string, recipe: RecipeInput): Promise<Recipe> {
		const response = await this.request(
			`/api/recipes/${encodeURIComponent(id)}`,
			"PUT",
			recipe
		);
		return (await response.json()) as Recipe;
	}

	async deleteRecipe(id: string): Promise<void> {
		await this.request(`/api/recipes/${encodeURIComponent(id)}`, "DELETE");
	}
}

export default new RecipesApi();
