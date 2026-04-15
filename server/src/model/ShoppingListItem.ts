export default class ShoppingListItem {
	id: string;
	text: string;
	crossed: boolean;

	constructor(id: string, text: string, crossed: boolean) {
		this.id = id;
		this.text = text;
		this.crossed = crossed;
	}
}
