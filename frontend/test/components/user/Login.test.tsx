import { afterEach, expect, vi, it, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Login from "../../../src/components/login/Login";

const useNavigateMock = vi.fn();
const mockLogin = vi.hoisted(() => vi.fn());
const mockSocketConnect = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => ({
	...(await vi.importActual("react-router-dom")),
	useNavigate: () => useNavigateMock
}));

vi.mock("../../../src/api/LoginApi", () => ({
	default: { login: mockLogin }
}));

vi.mock("../../../src/socket", () => ({
	default: { connect: mockSocketConnect }
}));

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.clearAllMocks();
});

it("Renders login screen", () => {
	render(<Login />);
});

test("Submits credentials, stores the token, and connects the socket", async () => {
	localStorage.clear();
	useNavigateMock.mockReset();
	mockLogin.mockResolvedValueOnce("signed-token");
	render(<Login />);
	fireEvent.change(screen.getByPlaceholderText("Käyttäjätunnus"), {
		target: { value: "alice" }
	});
	fireEvent.change(screen.getByPlaceholderText("Salasana"), {
		target: { value: "secret" }
	});
	const form = screen.getByRole("button", { name: "Kirjaudu" }).closest("form");
	if (form) {
		fireEvent.submit(form);
	}

	expect(mockLogin).toHaveBeenCalledWith("alice", "secret");
	await vi.waitFor(() => {
		expect(localStorage.getItem("jwt")).toBe("signed-token");
	});
	expect(mockSocketConnect).toHaveBeenCalledOnce();
	expect(useNavigateMock).toHaveBeenCalledWith("/", { replace: true });
});

test("Displays an error when login fails", async () => {
	localStorage.clear();
	useNavigateMock.mockReset();
	mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));
	vi.spyOn(console, "log").mockImplementation(() => undefined);
	render(<Login />);
	fireEvent.change(screen.getByPlaceholderText("Käyttäjätunnus"), {
		target: { value: "alice" }
	});
	fireEvent.change(screen.getByPlaceholderText("Salasana"), {
		target: { value: "wrong" }
	});
	const form = screen.getByRole("button", { name: "Kirjaudu" }).closest("form");
	if (form) {
		fireEvent.submit(form);
	}

	expect(await screen.findByText("Kirjautuminen epäonnistui")).toBeTruthy();
	expect(localStorage.getItem("jwt")).toBeNull();
});
