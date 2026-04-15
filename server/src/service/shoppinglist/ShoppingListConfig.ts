import type ShoppingListItemConfig from "./ShoppingListItemConfig.js";

export default interface ShoppingListConfig {
	update: string;
	items: ShoppingListItemConfig[];
}
