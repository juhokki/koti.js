import AuthUtil from "../util/AuthUtil";

class ShoppingListApi {
	async appendItems(items: string[]): Promise<void> {
		const response = await fetch("/api/shoppinglist", {
			method: "PATCH",
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ items })
		});

		if (!response.ok) {
			throw new Error(
				`Shopping list request failed: ${String(response.status)}`
			);
		}
	}
}

export default new ShoppingListApi();
