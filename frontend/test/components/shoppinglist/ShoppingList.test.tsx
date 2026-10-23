import { expect, vi, it, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ShoppingListView from "../../../src/components/shoppinglist/ShoppingListView";
import { ShoppingListContext } from "../../../src/context/ShoppingListContext";
import type { ShoppingList } from "../../../src/interface/ShoppingList";

const useNavigateMock = vi.fn();

vi.mock("react-router-dom", async () => ({
	...(await vi.importActual("react-router-dom")),
	useNavigate: () => useNavigateMock
}));

it("Renders shopping list screen", () => {
	render(<ShoppingListView />);
});

test("Adds, crosses, removes, and clears shopping list items", () => {
	const shoppingList: ShoppingList = {
		update: "update-1",
		items: [
			{ id: "milk", text: "Milk", crossed: false },
			{ id: "bread", text: "Bread", crossed: true }
		]
	};
	const setShoppingList = vi.fn<
		(list: ShoppingList, callback: (error?: Error) => void) => void
	>();
	render(
		<ShoppingListContext.Provider value={{ shoppingList, setShoppingList }}>
			<ShoppingListView />
		</ShoppingListContext.Provider>
	);

	fireEvent.click(screen.getByText("Milk"));
	expect(setShoppingList).toHaveBeenLastCalledWith(
		{
			update: "update-1",
			items: [
				{ id: "milk", text: "Milk", crossed: true },
				{ id: "bread", text: "Bread", crossed: true }
			]
		},
		expect.any(Function)
	);

	const input = screen.getByPlaceholderText("Lisää ostettava asia");
	fireEvent.change(input, { target: { value: "Apples" } });
	const form = input.closest("form");
	expect(form).not.toBeNull();
	if (form) {
		fireEvent.submit(form);
	}
	const addedList = setShoppingList.mock.calls[1]?.[0];
	expect(addedList).toBeDefined();
	if (!addedList) {
		return;
	}
	expect(addedList.items).toHaveLength(3);
	expect(addedList.items[2]).toMatchObject({
		text: "Apples",
		crossed: false
	});

	fireEvent.click(screen.getAllByTestId("RemoveCircleIcon")[0]);
	expect(setShoppingList).toHaveBeenLastCalledWith(
		expect.objectContaining({
			items: [{ id: "bread", text: "Bread", crossed: true }]
		}),
		expect.any(Function)
	);

	fireEvent.click(screen.getByRole("button", { name: "Poista ostetut" }));
	expect(setShoppingList).toHaveBeenLastCalledWith(
		{ update: "update-1", items: [{ id: "milk", text: "Milk", crossed: false }] },
		expect.any(Function)
	);
});
