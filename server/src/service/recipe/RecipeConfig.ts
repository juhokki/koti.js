export interface RecipeIngredientConfig {
	amount: string;
	unit: string;
	name: string;
}

export interface RecipeItemConfig {
	id: string;
	title: string;
	ingredients: RecipeIngredientConfig[];
	steps: string[];
}

export default interface RecipeConfig {
	recipes: RecipeItemConfig[];
}
