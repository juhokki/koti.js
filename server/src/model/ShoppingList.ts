import type ShoppingListItem from "./ShoppingListItem.ts";

export default class ShoppingList {
	update: string;
	items: ShoppingListItem[];

	constructor(update: string, items: ShoppingListItem[]) {
		this.update = update;
		this.items = items;
	}
}
