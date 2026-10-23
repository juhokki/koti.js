import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../../src/components/App";

const socketMock = vi.hoisted(() => ({
	auth: {},
	on: vi.fn(),
	off: vi.fn(),
	once: vi.fn(),
	connect: vi.fn(),
	disconnect: vi.fn()
}));

vi.mock("../../src/socket", () => ({ default: socketMock }));

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.clearAllMocks();
});

test("Redirects unauthenticated users to login", async () => {
	localStorage.clear();
	render(
		<MemoryRouter initialEntries={["/"]}>
			<App />
		</MemoryRouter>
	);

	expect(await screen.findByRole("button", { name: "Kirjaudu" })).toBeTruthy();
	expect(socketMock.connect).not.toHaveBeenCalled();
});

test("Connects with a saved token and redirects away from login", async () => {
	localStorage.setItem("jwt", "saved-token");
	render(
		<MemoryRouter initialEntries={["/login"]}>
			<App />
		</MemoryRouter>
	);

	expect(await screen.findByText("Ostoslista")).toBeTruthy();
	expect(socketMock.auth).toEqual({ token: "Bearer saved-token" });
	expect(socketMock.connect).toHaveBeenCalled();
	expect(socketMock.once).toHaveBeenCalledWith(
		"connect_error",
		expect.any(Function)
	);
});