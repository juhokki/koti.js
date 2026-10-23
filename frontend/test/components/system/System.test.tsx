import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Integration from "../../../src/components/system/Integration";
import Logs from "../../../src/components/system/Logs";
import System from "../../../src/components/system/System";

const mockGetSystemStats = vi.hoisted(() => vi.fn());
const mockGetIntegration = vi.hoisted(() => vi.fn());
const mockGetLogs = vi.hoisted(() => vi.fn());

vi.mock("../../../src/api/SystemApi", () => ({
	default: {
		getSystemStats: mockGetSystemStats,
		getIntegration: mockGetIntegration
	}
}));

vi.mock("../../../src/api/LogsApi", () => ({
	default: {
		getLogs: mockGetLogs
	}
}));

const systemStats = {
	uptime: 90061,
	disk: { size: 1_000_000, free: 500_000 },
	integrations: ["ShellyIntegration"]
};

function renderRoutes(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route path="/system" element={<System />} />
				<Route path="/system/logs" element={<Logs />} />
				<Route
					path="/system/integrations/:name"
					element={<Integration />}
				/>
				<Route path="/system/integrations" element={<Integration />} />
			</Routes>
		</MemoryRouter>
	);
}

beforeEach(() => {
	mockGetSystemStats.mockReset();
	mockGetIntegration.mockReset();
	mockGetLogs.mockReset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

test("System displays server, disk, and integration data", async () => {
	mockGetSystemStats.mockResolvedValueOnce(systemStats);
	renderRoutes("/system");

	expect(await screen.findByText("Järjestelmä")).toBeTruthy();
	expect(screen.getByText("1 pv 01:01:01")).toBeTruthy();
	expect(screen.getByText("Koko")).toBeTruthy();
	expect(screen.getByText("Vapaana")).toBeTruthy();
	expect(screen.getByText("Shelly Integration")).toBeTruthy();
});

test("System displays an error when stats cannot be loaded", async () => {
	mockGetSystemStats.mockRejectedValueOnce(new Error("offline"));
	renderRoutes("/system");

	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();
});

test("Integration displays parameters and opens URL values", async () => {
	mockGetIntegration.mockResolvedValueOnce({
		name: "MatterIntegration",
		parameters: [
			{ name: "Server URL", value: "ws://localhost:5580" },
			{ name: "Connected nodes", value: 3 },
			{ name: "Unsupported scheme", value: "javascript:alert(1)" }
		]
	});
	const open = vi.spyOn(window, "open").mockImplementation(() => null);
	renderRoutes("/system/integrations/MatterIntegration");

	expect(await screen.findByText("Matter Integration")).toBeTruthy();
	expect(screen.getByText("Connected nodes")).toBeTruthy();
	expect(screen.getByText("3")).toBeTruthy();
	expect(screen.getByText("javascript:alert(1)")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "Avaa" }));
	expect(open).toHaveBeenCalledWith(
		"ws://localhost:5580",
		"_blank",
		"noopener,noreferrer"
	);
});

test("Integration displays empty and failed parameter states", async () => {
	mockGetIntegration.mockResolvedValueOnce({ name: "RestApiIntegration", parameters: [] });
	renderRoutes("/system/integrations/RestApiIntegration");
	expect(await screen.findByText("Ei parametreja")).toBeTruthy();

	cleanup();
	mockGetIntegration.mockRejectedValueOnce(new Error("offline"));
	renderRoutes("/system/integrations/UnknownIntegration");
	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();
});

test("Logs displays fetched entries and refetches when a level changes", async () => {
	const entry = {
		level: 50,
		time: new Date(2024, 0, 1, 12).getTime(),
		msg: "sensor unavailable"
	};
	mockGetLogs.mockResolvedValue({ entries: [entry] });
	renderRoutes("/system/logs");

	expect(await screen.findByText("sensor unavailable")).toBeTruthy();
	expect(mockGetLogs).toHaveBeenCalledTimes(1);
	fireEvent.click(screen.getByRole("button", { name: "info logs" }));

	await waitFor(() => {
		expect(mockGetLogs).toHaveBeenCalledTimes(2);
	});
	expect(mockGetLogs.mock.calls[1]?.[2]).toEqual(["warn", "error"]);
});

test("Logs handles failed requests and empty level selection", async () => {
	mockGetLogs.mockRejectedValueOnce(new Error("offline"));
	renderRoutes("/system/logs");
	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();

	cleanup();
	mockGetLogs.mockResolvedValue({ entries: [] });
	renderRoutes("/system/logs");
	expect(
		await screen.findByText("Lokimerkintöjä ei löytynyt valitulta päivältä.")
	).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "info logs" }));
	fireEvent.click(screen.getByRole("button", { name: "warn logs" }));
	fireEvent.click(screen.getByRole("button", { name: "error logs" }));

	expect(
		await screen.findByText("Valitse vähintään yksi lokitaso.")
	).toBeTruthy();
});