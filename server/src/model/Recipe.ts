import type RecipeIngredient from "./RecipeIngredient.ts";

export default class Recipe {
	id: string;
	title: string;
	ingredients: RecipeIngredient[];
	steps: string[];
	owner: string;

	constructor(
		id: string,
		title: string,
		ingredients: RecipeIngredient[],
		steps: string[],
		owner: string
	) {
		this.id = id;
		this.title = title;
		this.ingredients = ingredients;
		this.steps = steps;
		this.owner = owner;
	}
}
