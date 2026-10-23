import { useContext, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import * as Messages from "../../src/constants/Messages";
import { STATUS_OK } from "../../src/constants/HTTPStatus";
import { AlarmsContext, AlarmsContextProvider } from "../../src/context/AlarmsContext";
import { AppContext, AppContextProvider } from "../../src/context/AppContext";
import { AssetsContext, AssetsContextProvider } from "../../src/context/AssetsContext";
import {
	ShoppingListContext,
	ShoppingListContextProvider
} from "../../src/context/ShoppingListContext";
import { UserContext, UserContextProvider } from "../../src/context/UserContext";
import type { Alarm } from "../../src/interface/Alarm";
import type { Asset } from "../../src/interface/Asset";
import type { ShoppingList } from "../../src/interface/ShoppingList";
import type { User } from "../../src/interface/User";

const mockSocketOn = vi.hoisted(() => vi.fn());
const mockSocketOff = vi.hoisted(() => vi.fn());
const mockSocketEmit = vi.hoisted(() => vi.fn());

vi.mock("../../src/socket", () => ({
	default: {
		on: mockSocketOn,
		off: mockSocketOff,
		emit: mockSocketEmit
	}
}));

const handlers = new Map<string, (...args: unknown[]) => void>();
const user: User = { username: "alice", locale: "fi" };
const asset: Asset = { id: "home", name: "Home", icon: "home", devices: [] };
const alarm: Alarm = {
	assetId: "home",
	assetName: "Home",
	deviceId: "heater",
	deviceName: "Heater",
	measurementId: "temperature",
	measurementName: "Temperature",
	name: "Too warm",
	time: 10,
	type: "value.upper-limit"
};
const shoppingList: ShoppingList = {
	update: "now",
	items: [{ id: "milk", text: "Milk", crossed: false }]
};

function ContextConsumer() {
	const { connected } = useContext(AppContext);
	const { user } = useContext(UserContext);
	const { assets } = useContext(AssetsContext);
	const { alarms } = useContext(AlarmsContext);
	const { shoppingList, setShoppingList } = useContext(ShoppingListContext);
	const [saveResult, setSaveResult] = useState("");

	return (
		<div>
			<span data-testid="connected">{String(connected)}</span>
			<span data-testid="user">{user?.username ?? "none"}</span>
			<span data-testid="assets">{assets.map((item) => item.name).join(",")}</span>
			<span data-testid="alarms">{alarms?.map((item) => item.name).join(",") ?? "none"}</span>
			<span data-testid="shopping-list">
				{shoppingList?.items.map((item) => item.text).join(",") ?? "none"}
			</span>
			<span data-testid="save-result">{saveResult}</span>
			<button
				onClick={() => {
					setShoppingList(shoppingList, (error) =>
						{
							setSaveResult(error ? error.message : "saved");
						}
					);
				}}
			>
				Save
			</button>
		</div>
	);
}

function renderProviders() {
	return render(
		<AppContextProvider>
			<UserContextProvider>
				<AssetsContextProvider>
					<AlarmsContextProvider>
						<ShoppingListContextProvider>
							<ContextConsumer />
						</ShoppingListContextProvider>
					</AlarmsContextProvider>
				</AssetsContextProvider>
			</UserContextProvider>
		</AppContextProvider>
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	handlers.clear();
});

test("Receives connection, user, asset, alarm, and shopping-list socket events", () => {
	mockSocketOn.mockImplementation(
		(event: string, callback: (...args: unknown[]) => void) => {
			handlers.set(event, callback);
		}
	);
	const { unmount } = renderProviders();

	expect(screen.getByTestId("connected").textContent).toBe("false");
	expect(screen.getByTestId("user").textContent).toBe("none");
	act(() => {
		handlers.get(Messages.CONNECT)?.();
	});
	act(() => {
		handlers.get(Messages.USER)?.(user);
	});
	act(() => {
		handlers.get(Messages.ASSETS)?.([asset]);
	});
	act(() => {
		handlers.get(Messages.ALARMS)?.([alarm]);
	});
	act(() => {
		handlers.get(Messages.SHOPPINGLIST)?.(shoppingList);
	});

	expect(screen.getByTestId("connected").textContent).toBe("true");
	expect(screen.getByTestId("user").textContent).toBe("alice");
	expect(screen.getByTestId("assets").textContent).toBe("Home");
	expect(screen.getByTestId("alarms").textContent).toBe("Too warm");
	expect(screen.getByTestId("shopping-list").textContent).toBe("Milk");

	act(() => {
		handlers.get(Messages.DISCONNECT)?.();
	});
	expect(screen.getByTestId("connected").textContent).toBe("false");
	unmount();

	expect(mockSocketOff).toHaveBeenCalledWith(Messages.CONNECT);
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.DISCONNECT);
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.USER);
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.ASSETS);
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.ALARMS);
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.SHOPPINGLIST);
});

test("Reports shopping-list socket acknowledgement success and failure", () => {
	mockSocketOn.mockImplementation(
		(event: string, callback: (...args: unknown[]) => void) => {
			handlers.set(event, callback);
		}
	);
	renderProviders();
	fireEvent.click(screen.getByRole("button", { name: "Save" }));

	expect(mockSocketEmit).toHaveBeenCalledWith(
		Messages.SHOPPINGLIST,
		null,
		expect.any(Function)
	);
	const callback = mockSocketEmit.mock.calls[0]?.[2] as (
		status: number
	) => void;
	act(() => {
		callback(STATUS_OK);
	});
	expect(screen.getByTestId("save-result").textContent).toBe("saved");
	act(() => {
		callback(500);
	});
	expect(screen.getByTestId("save-result").textContent).toBe(
		"Failed to update shopping list"
	);
});