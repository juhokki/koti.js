import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DeviceActions from "../../../src/components/devices/DeviceActions";
import DeviceAlarms from "../../../src/components/devices/DeviceAlarms";
import DeviceSchedules from "../../../src/components/devices/DeviceSchedules";
import DeviceLayout from "../../../src/components/devices/DeviceLayout";
import DeviceActionScript from "../../../src/components/devices/DeviceActionScript";
import DeviceView from "../../../src/components/devices/DeviceView";
import { AlarmsContext } from "../../../src/context/AlarmsContext";
import { AssetsContext } from "../../../src/context/AssetsContext";
import {
	ValuesContext,
	ValueContextEmitter
} from "../../../src/context/ValuesContext";
import {
	ActionTrigger,
	DeviceOnlineStatus,
	DeviceType,
	MeasurementType,
	ScheduleType
} from "../../../src/interface/Asset";
import type { Device, Measurement } from "../../../src/interface/Asset";
import { AlarmType, type Alarm } from "../../../src/interface/Alarm";

const mockExecuteAction = vi.hoisted(() => vi.fn());

vi.mock("../../../src/api/ActionsApi", () => ({
	default: { executeAction: mockExecuteAction }
}));

const measurement: Measurement = {
	deviceId: "device-1",
	id: "temperature",
	name: "Temperature",
	type: MeasurementType.Number,
	unit: "C",
	icon: "thermostat",
	controllable: false,
	min: undefined,
	max: undefined,
	actions: [{ name: "Notify", trigger: ActionTrigger.OnChange, script: "" }],
	alarms: [
		{ name: "High temperature", type: AlarmType.ValueUpperLimit, limit: 30 }
	],
	schedules: [
		{
			name: "Morning",
			type: ScheduleType.Cron,
			options: { expression: "0 8 * * *" },
			value: 20
		},
		{
			name: "Evening",
			type: ScheduleType.Suncalc,
			options: { lat: 60.17, lng: 24.94, property: "sunset" },
			value: 10
		}
	],
	disabled: false
};

const device: Device = {
	id: "device-1",
	type: DeviceType.ShellyIntegration,
	name: "Living room",
	icon: "thermostat",
	measurements: [measurement],
	onlineStatus: DeviceOnlineStatus.ONLINE
};

const activeAlarm: Alarm = {
	deviceId: device.id,
	deviceName: device.name,
	measurementId: measurement.id,
	measurementName: measurement.name,
	name: "High temperature",
	time: Date.now() - 60_000,
	type: AlarmType.ValueUpperLimit
};

function renderDeviceRoute(
	path: string,
	component: ReactNode,
	alarms: Alarm[] = [],
	currentDevice: Device = device
) {
	const values = new ValueContextEmitter();
	values.set("device-1-temperature", {
		deviceId: "device-1",
		measurementId: "temperature",
		value: 22,
		time: Date.now()
	});
	return render(
		<ValuesContext.Provider value={{ values }}>
			<AssetsContext.Provider
				value={{ assets: [], devices: [currentDevice] }}
			>
				<AlarmsContext.Provider value={{ alarms }}>
					<MemoryRouter initialEntries={[path]}>
						{component}
					</MemoryRouter>
				</AlarmsContext.Provider>
			</AssetsContext.Provider>
		</ValuesContext.Provider>
	);
}

afterEach(cleanup);

test("Device actions show configured actions and the empty state", () => {
	renderDeviceRoute(
		"/devices/device-1/actions",
		<Routes>
			<Route
				path="/devices/:deviceId/:section?"
				element={<DeviceActions />}
			/>
		</Routes>
	);

	expect(screen.getByText("Notify")).toBeTruthy();
	expect(screen.getByText("Arvon muuttuessa")).toBeTruthy();
});

test("Action script view shows the script and the execution result", async () => {
	mockExecuteAction.mockResolvedValueOnce({ ok: false, error: "boom" });
	mockExecuteAction.mockResolvedValueOnce({ ok: true });

	renderDeviceRoute(
		"/devices/device-1/actions",
		<Routes>
			<Route path="/devices/:deviceId" element={<DeviceLayout />}>
				<Route path="actions" element={<DeviceActions />} />
				<Route path="script" element={<DeviceActionScript />} />
			</Route>
		</Routes>
	);

	fireEvent.click(screen.getByText("Näytä"));
	fireEvent.click(screen.getByText("Suorita"));

	expect(await screen.findByText("boom")).toBeTruthy();
	expect(mockExecuteAction).toHaveBeenCalledWith(
		"device-1",
		"temperature",
		"Notify",
		"onChange"
	);

	fireEvent.click(screen.getByText("Suorita"));

	expect(await screen.findByText("OK")).toBeTruthy();

	fireEvent.click(screen.getByTestId("ChevronLeftIcon"));

	expect(screen.getByText("Arvon muuttuessa")).toBeTruthy();
});

test("Device alarms distinguish active alarms from clear alarms", () => {
	renderDeviceRoute(
		"/devices/device-1/alarms",
		<Routes>
			<Route
				path="/devices/:deviceId/:section?"
				element={<DeviceAlarms />}
			/>
		</Routes>,
		[activeAlarm]
	);

	expect(screen.getByText("High temperature")).toBeTruthy();
	expect(screen.getByText("Raja-arvo")).toBeTruthy();
	expect(screen.getByText("30")).toBeTruthy();
	expect(screen.getByText("Alkanut 1 minuutti sitten")).toBeTruthy();
});

test("Device schedules show configured times and empty state", () => {
	renderDeviceRoute(
		"/devices/device-1/schedules",
		<Routes>
			<Route
				path="/devices/:deviceId/:section?"
				element={<DeviceSchedules />}
			/>
		</Routes>
	);

	expect(screen.getByText("Morning")).toBeTruthy();
	expect(screen.getByText("0 8 * * *")).toBeTruthy();
	expect(screen.getByText("Arvo").className).toContain(
		"hide-on-small-screen"
	);
	expect(screen.getByText("20").className).toContain("hide-on-small-screen");
	expect(screen.getByText("Evening")).toBeTruthy();
	expect(screen.getByText("sunset")).toBeTruthy();
	expect(screen.getByText("10").className).toContain("hide-on-small-screen");
});

test("Device summary renders values and navigates to history", async () => {
	renderDeviceRoute(
		"/assets",
		<Routes>
			<Route path="/assets" element={<DeviceView device={device} />} />
			<Route
				path="/devices/:deviceId/history"
				element={<p>History view</p>}
			/>
		</Routes>
	);

	expect(screen.getByText("22 C")).toBeTruthy();
	expect(screen.getByText("Toiminnot")).toBeTruthy();
	expect(screen.getByText("Hälytykset")).toBeTruthy();
	expect(screen.getByText("Ajastukset")).toBeTruthy();
	fireEvent.click(screen.getByText("Living room"));
	expect(await screen.findByText("History view")).toBeTruthy();
});

test("Device sections show their empty messages when nothing is configured", () => {
	const emptyDevice = { ...device, measurements: [] };
	const routes = (
		<Routes>
			<Route path="/devices/:deviceId" element={<DeviceLayout />}>
				<Route path="actions" element={<DeviceActions />} />
				<Route path="alarms" element={<DeviceAlarms />} />
				<Route path="schedules" element={<DeviceSchedules />} />
			</Route>
		</Routes>
	);
	renderDeviceRoute("/devices/device-1/actions", routes, [], emptyDevice);
	expect(screen.getByText("Ei toimintoja.")).toBeTruthy();

	cleanup();
	renderDeviceRoute("/devices/device-1/alarms", routes, [], emptyDevice);
	expect(screen.getByText("Ei hälytyksiä.")).toBeTruthy();

	cleanup();
	renderDeviceRoute("/devices/device-1/schedules", routes, [], emptyDevice);
	expect(screen.getByText("Ei ajastuksia.")).toBeTruthy();
});
