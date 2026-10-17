export interface RecipeIngredient {
	amount: string;
	unit: string;
	name: string;
}

export interface RecipeInput {
	title: string;
	ingredients: RecipeIngredient[];
	steps: string[];
}

export interface Recipe extends RecipeInput {
	id: string;
	owner: string;
}
