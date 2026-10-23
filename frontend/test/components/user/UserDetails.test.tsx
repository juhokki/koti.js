import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserDetails from "../../../src/components/user/UserDetails";
import { UserContext } from "../../../src/context/UserContext";
import { PUBLIC_KEY } from "../../../src/constants/Vapid";
import type { User } from "../../../src/interface/User";

const mockCheckSubscription = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn());
const mockCancelSubscription = vi.hoisted(() => vi.fn());
const mockDisconnect = vi.hoisted(() => vi.fn());
const mockUnsubscribe = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("../../../src/api/WebPushApi", () => ({
	default: {
		checkSubscription: mockCheckSubscription,
		subscribe: mockSubscribe,
		cancelSubscription: mockCancelSubscription
	}
}));

vi.mock("../../../src/socket", () => ({
	default: { disconnect: mockDisconnect }
}));

const user: User = { username: "alice", locale: "fi" };
const subscription = {
	endpoint: "https://push.example/endpoint",
	toJSON: () => ({ endpoint: "https://push.example/endpoint" }),
	unsubscribe: mockUnsubscribe
} as unknown as PushSubscription;
const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(
	navigator,
	"serviceWorker"
);

function setServiceWorker(ready: Promise<ServiceWorkerRegistration>) {
	Object.defineProperty(navigator, "serviceWorker", {
		configurable: true,
		value: { ready }
	});
}

function renderUser() {
	const setUser = vi.fn();
	return {
		setUser,
		...render(
			<UserContext.Provider value={{ user, setUser }}>
				<MemoryRouter initialEntries={["/user"]}>
					<Routes>
						<Route path="/user" element={<UserDetails />} />
						<Route path="/login" element={<p>Login page</p>} />
					</Routes>
				</MemoryRouter>
			</UserContext.Provider>
		)
	};
}

beforeEach(() => {
	mockCheckSubscription.mockReset();
	mockSubscribe.mockReset();
	mockCancelSubscription.mockReset();
	mockDisconnect.mockReset();
	mockUnsubscribe.mockReset().mockResolvedValue(true);
	localStorage.clear();
	localStorage.setItem("jwt", "token");
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	if (originalServiceWorkerDescriptor) {
		Object.defineProperty(
			navigator,
			"serviceWorker",
			originalServiceWorkerDescriptor
		);
	} else {
		Reflect.deleteProperty(navigator, "serviceWorker");
	}
	localStorage.clear();
});

test("Displays user details and enabled status for an existing subscription", async () => {
	const pushManager = { getSubscription: vi.fn().mockResolvedValue(subscription) };
	setServiceWorker(Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration));
	mockCheckSubscription.mockResolvedValueOnce({ status: true });

	renderUser();

	expect(await screen.findByText("alice")).toBeTruthy();
	expect(screen.getByText("fi")).toBeTruthy();
	expect(screen.getByRole("switch").checked).toBe(true);
	expect(mockCheckSubscription).toHaveBeenCalledWith(subscription);
});

test("Starts with notifications disabled when no subscription exists", async () => {
	const pushManager = { getSubscription: vi.fn().mockResolvedValue(null) };
	setServiceWorker(Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration));

	renderUser();

	expect(await screen.findByText("alice")).toBeTruthy();
	expect(screen.getByRole("switch").checked).toBe(false);
	expect(mockCheckSubscription).not.toHaveBeenCalled();
});

test("Enables notifications by creating and registering a subscription", async () => {
	const subscribePush = vi.fn().mockResolvedValue(subscription);
	const pushManager = {
		getSubscription: vi.fn().mockResolvedValue(null),
		subscribe: subscribePush
	};
	setServiceWorker(Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration));
	mockSubscribe.mockResolvedValueOnce(undefined);
	renderUser();

	const toggle = await screen.findByRole("switch");
	fireEvent.click(toggle);

	await waitFor(() => {
		expect(mockSubscribe).toHaveBeenCalledWith(subscription);
	});
	expect(subscribePush).toHaveBeenCalledWith({
		userVisibleOnly: true,
		applicationServerKey: PUBLIC_KEY
	});
	await waitFor(() => {
		expect(screen.getByRole("switch").checked).toBe(true);
	});
});

test("Disables notifications and removes the existing subscription", async () => {
	const pushManager = { getSubscription: vi.fn().mockResolvedValue(subscription) };
	setServiceWorker(Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration));
	mockCheckSubscription.mockResolvedValueOnce({ status: true });
	mockCancelSubscription.mockResolvedValueOnce(undefined);
	renderUser();

	const toggle = await screen.findByRole("switch");
	expect(toggle.checked).toBe(true);
	fireEvent.click(toggle);

	await waitFor(() => {
		expect(mockUnsubscribe).toHaveBeenCalled();
	});
	expect(mockCancelSubscription).toHaveBeenCalledWith(subscription);
	await waitFor(() => {
		expect(screen.getByRole("switch").checked).toBe(false);
	});
});

test("Displays an error when subscription status cannot be loaded", async () => {
	setServiceWorker(Promise.reject(new Error("Service worker unavailable")));
	vi.spyOn(console, "log").mockImplementation(() => undefined);
	renderUser();

	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();
});

test("Logout clears the user and token and disconnects the socket", async () => {
	const pushManager = { getSubscription: vi.fn().mockResolvedValue(null) };
	setServiceWorker(Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration));
	const { setUser } = renderUser();

	fireEvent.click(await screen.findByRole("button", { name: "Kirjaudu ulos" }));

	expect(await screen.findByText("Login page")).toBeTruthy();
	expect(setUser).toHaveBeenCalledWith(null);
	expect(localStorage.getItem("jwt")).toBeNull();
	expect(mockDisconnect).toHaveBeenCalledOnce();
});