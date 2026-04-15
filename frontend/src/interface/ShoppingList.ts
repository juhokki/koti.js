export interface ShoppingList {
	update: string;
	items: ShoppingListItem[];
}

export interface ShoppingListItem {
	id: string;
	text: string;
	crossed: boolean;
}
