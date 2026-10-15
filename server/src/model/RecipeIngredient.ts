export default class RecipeIngredient {
	amount: string;
	unit: string;
	name: string;

	constructor(amount: string, unit: string, name: string) {
		this.amount = amount;
		this.unit = unit;
		this.name = name;
	}
}
