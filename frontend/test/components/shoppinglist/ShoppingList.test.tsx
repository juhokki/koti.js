import { vi, it } from "vitest";
import { render } from "@testing-library/react";
import ShoppingListView from "../../../src/components/shoppinglist/ShoppingListView";

const useNavigateMock = vi.fn();

vi.mock("react-router-dom", async () => ({
	...(await vi.importActual("react-router-dom")),
	useNavigate: () => useNavigateMock
}));

it("Renders shopping list screen", () => {
	render(<ShoppingListView />);
});
