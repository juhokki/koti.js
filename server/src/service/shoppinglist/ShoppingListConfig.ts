import type ShoppingListItemConfig from "./ShoppingListItemConfig.ts";

export default interface ShoppingListConfig {
	update: string;
	items: ShoppingListItemConfig[];
}
