import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Integration from "../../../src/components/system/Integration";
import Logs from "../../../src/components/system/Logs";
import Service from "../../../src/components/system/Service";
import System from "../../../src/components/system/System";
import AssetManagement from "../../../src/components/system/AssetManagement";
import DeviceManagement from "../../../src/components/system/DeviceManagement";
import DeviceLayout from "../../../src/components/devices/DeviceLayout";
import DeviceDetails from "../../../src/components/devices/DeviceDetails";
import DeviceAlarms from "../../../src/components/devices/DeviceAlarms";
import TreeList from "../../../src/components/common/TreeList";
import { AssetsContext } from "../../../src/context/AssetsContext";
import { AlarmsContext } from "../../../src/context/AlarmsContext";
import {
	DeviceType,
	DeviceOnlineStatus,
	MeasurementType,
	type Asset,
	type Device
} from "../../../src/interface/Asset";

const mockGetSystemStats = vi.hoisted(() => vi.fn());
const mockGetIntegration = vi.hoisted(() => vi.fn());
const mockGetService = vi.hoisted(() => vi.fn());
const mockGetLogs = vi.hoisted(() => vi.fn());

vi.mock("../../../src/api/SystemApi", () => ({
	default: {
		getSystemStats: mockGetSystemStats,
		getIntegration: mockGetIntegration,
		getService: mockGetService
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
	integrations: ["ShellyIntegration"],
	services: ["DataService"]
};

const managementDevice: Device = {
	id: "standalone",
	name: "Standalone sensor",
	icon: "sensors",
	type: DeviceType.RestApiIntegration,
	onlineStatus: DeviceOnlineStatus.ONLINE,
	measurements: [
		{
			deviceId: "standalone",
			id: "temperature",
			name: "Temperature",
			icon: "thermostat",
			type: MeasurementType.Number,
			unit: "C",
			controllable: false,
			min: 0,
			max: 40,
			steps: [10, 20],
			disabled: false,
			alarms: [],
			actions: [],
			schedules: []
		}
	]
};
const managementAsset = (id: string, links: string[] = []): Asset => ({
	id,
	name: id,
	icon: "home",
	links,
	deviceIds: []
});
const managementAssets = [
	managementAsset("root", ["house", "cabin"]),
	managementAsset("house", ["kitchen"]),
	managementAsset("cabin", ["kitchen"]),
	managementAsset("kitchen"),
	managementAsset("unlinked")
];

function renderManagement(
	path: string,
	assets: Asset[] = managementAssets,
	devices: Device[] = [managementDevice],
	loading = false
) {
	return render(
		<AssetsContext.Provider value={{ assets, devices, loading }}>
			<AlarmsContext.Provider value={{ alarms: [] }}>
				<MemoryRouter initialEntries={[path]}>
					<Routes>
						<Route
							path="/system/assets/:assetId?"
							element={<AssetManagement />}
						/>
						<Route
							path="/system/devices"
							element={<DeviceManagement />}
						/>
						<Route
							path="/devices/:deviceId"
							element={<DeviceLayout />}
						>
							<Route index element={<DeviceDetails />} />
							<Route path="alarms" element={<DeviceAlarms />} />
						</Route>
						<Route path="/alarms" element={<p>Alarm list</p>} />
						<Route
							path="/system"
							element={<p>System overview</p>}
						/>
					</Routes>
				</MemoryRouter>
			</AlarmsContext.Provider>
		</AssetsContext.Provider>
	);
}

test("TreeList renders all descendants and accessible links without expansion controls", () => {
	render(
		<MemoryRouter>
			<TreeList
				label="Sample tree"
				nodes={[
					{
						id: "group",
						label: "Group",
						children: [
							{
								id: "parent",
								label: "Parent",
								to: "/parent",
								children: [
									{ id: "leaf", label: "Leaf", to: "/leaf" }
								]
							}
						]
					}
				]}
			/>
		</MemoryRouter>
	);
	expect(
		screen.getByRole("navigation", { name: "Sample tree" })
	).toBeTruthy();
	expect(screen.getByRole("link", { name: "Parent" })).toBeTruthy();
	expect(
		screen.getByRole("link", { name: "Leaf" }).getAttribute("href")
	).toBe("/leaf");
	expect(screen.queryByRole("link", { name: "Group" })).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();
});

test("Asset management shows all root descendants and navigates to details and back", () => {
	renderManagement("/system/assets");
	expect(screen.getAllByRole("link", { name: /kitchen/ })).toHaveLength(2);
	expect(screen.queryByText("unlinked")).toBeNull();
	fireEvent.click(screen.getByRole("link", { name: /house/ }));
	expect(screen.getByText("ID")).toBeTruthy();
	expect(screen.queryByRole("navigation", { name: "Kohteet" })).toBeNull();
	fireEvent.click(screen.getByRole("link", { name: "Takaisin" }));
	expect(screen.getAllByRole("link", { name: /kitchen/ })).toHaveLength(2);
});

test("Asset management guards cycles and skips missing linked assets", () => {
	renderManagement("/system/assets", [
		managementAsset("root", ["child", "missing"]),
		managementAsset("child", ["root"])
	]);
	expect(screen.getAllByRole("link", { name: /root/ })).toHaveLength(1);
	expect(screen.getByRole("link", { name: /child/ })).toBeTruthy();
	expect(screen.queryByText("missing")).toBeNull();
});

test("Asset details resolve assigned device and summary IDs", () => {
	renderManagement("/system/assets/root", [
		{
			...managementAsset("root"),
			deviceIds: [managementDevice.id],
			summary: {
				devices: [
					{
						deviceId: managementDevice.id,
						displayName: "Kitchen reading",
						measurementIds: ["temperature"]
					}
				]
			}
		}
	]);
	expect(screen.getByText("Kitchen reading")).toBeTruthy();
	expect(screen.getByText("Temperature")).toBeTruthy();
	expect(
		screen
			.getAllByRole("link", { name: managementDevice.name })
			.every(
				(link) => link.getAttribute("href") === "/devices/standalone"
			)
	).toBe(true);
});

test("Device tree groups all devices by integration and selects standalone details", () => {
	const shellyDevice = {
		...managementDevice,
		id: "shelly",
		name: "Shelly sensor",
		type: DeviceType.ShellyIntegration
	};
	renderManagement("/system/devices", [], [shellyDevice, managementDevice]);
	expect(screen.getByText("Rest Api Integration")).toBeTruthy();
	expect(screen.getByText("Shelly Integration")).toBeTruthy();
	expect(screen.getByRole("link", { name: /Shelly sensor/ })).toBeTruthy();
	fireEvent.click(screen.getByRole("link", { name: /Standalone sensor/ }));
	expect(screen.getByText("standalone")).toBeTruthy();
	expect(screen.getByText("Temperature")).toBeTruthy();
	expect(screen.queryByText("online")).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();
	fireEvent.click(screen.getByRole("link", { name: "Takaisin" }));
	expect(screen.getByRole("navigation", { name: "Laitteet" })).toBeTruthy();
});

test("Device details preserve alarm origin through section navigation", () => {
	renderManagement("/devices/standalone?from=alarms");
	fireEvent.click(screen.getByRole("link", { name: "Hälytykset" }));
	expect(screen.getByText("Ei hälytyksiä.")).toBeTruthy();
	fireEvent.click(screen.getByTestId("ChevronLeftIcon"));
	fireEvent.click(screen.getByRole("link", { name: "Takaisin" }));
	expect(screen.getByText("Alarm list")).toBeTruthy();
});

test.each([
	["/system/assets", "Juurikohdetta ei löytynyt."],
	["/system/assets/missing", "Kohdetta ei löytynyt."],
	["/system/devices", "Ei laitteita."],
	["/devices/missing", "Laitetta ei löytynyt."]
])("Management handles empty or missing records at %s", (path, message) => {
	renderManagement(path, [], []);
	expect(screen.getByText(message)).toBeTruthy();
	expect(screen.getByRole("link", { name: "Takaisin" })).toBeTruthy();
});

test.each(["/system/assets", "/system/devices", "/devices/standalone"])(
	"Management waits for the separate catalogs at %s",
	(path) => {
		renderManagement(path, [], [], true);
		expect(document.querySelector(".loader")).toBeTruthy();
		expect(screen.queryByText(/ei löytynyt/)).toBeNull();
	}
);

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
				<Route path="/system/services/:name" element={<Service />} />
				<Route path="/system/integrations" element={<Integration />} />
			</Routes>
		</MemoryRouter>
	);
}

beforeEach(() => {
	mockGetSystemStats.mockReset();
	mockGetIntegration.mockReset();
	mockGetService.mockReset();
	mockGetLogs.mockReset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

test("System displays server, disk percentage, log, and integration data", async () => {
	mockGetSystemStats.mockResolvedValueOnce(systemStats);
	const { container } = renderRoutes("/system");

	expect(await screen.findByText("Järjestelmä")).toBeTruthy();
	expect(screen.getByText("1 pv 01:01:01")).toBeTruthy();
	expect(screen.getByText("Levytila vapaana")).toBeTruthy();
	expect(screen.getByText("50 %")).toBeTruthy();
	expect(screen.getByRole("button", { name: "Avaa lokit" })).toBeTruthy();
	expect(screen.getByText("Shelly Integration")).toBeTruthy();
	expect(screen.getByText("Data Service")).toBeTruthy();
	expect(container.querySelectorAll(".grid-item")).toHaveLength(4);
	expect(
		Array.from(container.querySelectorAll(".grid-item h3")).map((heading) =>
			heading.textContent.trim()
		)
	).toEqual(["Palvelin", "Kohteiden hallinta", "Integraatiot", "Palvelut"]);
	expect(
		screen.getByRole("link", { name: "Avaa kohteet" }).getAttribute("href")
	).toBe("/system/assets");
	expect(
		screen.getByRole("link", { name: "Avaa laitteet" }).getAttribute("href")
	).toBe("/system/devices");
});

test("System handles a disk without a valid size", async () => {
	mockGetSystemStats.mockResolvedValueOnce({
		...systemStats,
		disk: { size: 0, free: 0 }
	});
	renderRoutes("/system");

	expect(await screen.findByText("Ei saatavilla")).toBeTruthy();
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
	mockGetIntegration.mockResolvedValueOnce({
		name: "RestApiIntegration",
		parameters: []
	});
	renderRoutes("/system/integrations/RestApiIntegration");
	expect(await screen.findByText("Ei parametreja")).toBeTruthy();

	cleanup();
	mockGetIntegration.mockRejectedValueOnce(new Error("offline"));
	renderRoutes("/system/integrations/UnknownIntegration");
	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();
});

test("Service displays parameters", async () => {
	mockGetService.mockResolvedValueOnce({
		name: "DataService",
		parameters: [
			{ name: "Database", value: "TimescaleDatabase" },
			{ name: "Cached values count", value: 3 }
		]
	});
	renderRoutes("/system/services/DataService");

	expect(await screen.findByText("Data Service")).toBeTruthy();
	expect(screen.getByText("Database")).toBeTruthy();
	expect(screen.getByText("TimescaleDatabase")).toBeTruthy();
	expect(screen.getByText("3")).toBeTruthy();
});

test("Service displays empty and failed parameter states", async () => {
	mockGetService.mockResolvedValueOnce({
		name: "DataService",
		parameters: []
	});
	renderRoutes("/system/services/DataService");
	expect(await screen.findByText("Ei parametreja")).toBeTruthy();

	cleanup();
	mockGetService.mockRejectedValueOnce(new Error("offline"));
	renderRoutes("/system/services/UnknownService");
	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();
});

test("Logs displays fetched entries and refetches when a level changes", async () => {
	const entry = {
		level: 50,
		time: new Date(2024, 0, 1, 12).getTime(),
		msg: "sensor unavailable",
		err: {
			stack: [
				"Error: sensor unavailable",
				"    at readSensor (sensor.ts:12:3)"
			].join("\n")
		}
	};
	const plainEntry = {
		level: entry.level,
		time: entry.time,
		msg: "reading received"
	};
	mockGetLogs.mockResolvedValue({
		entries: [entry, plainEntry]
	});
	const { container } = renderRoutes("/system/logs");

	expect(await screen.findByText("sensor unavailable")).toBeTruthy();
	expect(container.querySelector(".grid-sub-item")?.textContent).toBe(
		entry.err.stack
	);
	expect(container.querySelectorAll(".grid-sub-item")).toHaveLength(1);
	expect(screen.getByText("reading received")).toBeTruthy();
	expect(mockGetLogs).toHaveBeenCalledTimes(1);
	fireEvent.click(screen.getByRole("button", { name: "info logs" }));

	await waitFor(() => {
		expect(mockGetLogs).toHaveBeenCalledTimes(2);
	});
	expect(mockGetLogs.mock.calls[1]?.[2]).toEqual(["warn", "error"]);
});

test("Logs displays additional fields passed to the logger", async () => {
	mockGetLogs.mockResolvedValue({
		entries: [
			{
				level: 20,
				time: new Date(2024, 0, 1, 12).getTime(),
				pid: 1,
				hostname: "host",
				msg: "Value type does not match.",
				measurement: { id: "temperature" },
				value: 5
			}
		]
	});
	const { container } = renderRoutes("/system/logs");

	expect(await screen.findByText("Value type does not match.")).toBeTruthy();
	const details = container.querySelector(".grid-sub-item")?.textContent;
	expect(JSON.parse(details ?? "{}")).toEqual({
		measurement: { id: "temperature" },
		value: 5
	});
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
	const noMessages = await screen.findByText(
		"Lokimerkintöjä ei löytynyt valituilla ehdoilla."
	);
	expect(noMessages.closest(".grid-item")).not.toBeNull();
	fireEvent.click(screen.getByRole("button", { name: "info logs" }));
	fireEvent.click(screen.getByRole("button", { name: "warn logs" }));
	fireEvent.click(screen.getByRole("button", { name: "error logs" }));

	expect(
		await screen.findByText("Valitse vähintään yksi lokitaso.")
	).toBeTruthy();
});
