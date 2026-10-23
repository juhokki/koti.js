import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DeviceActions from "../../../src/components/assets/device/DeviceActions";
import DeviceAlarms from "../../../src/components/assets/device/DeviceAlarms";
import DeviceSchedules from "../../../src/components/assets/device/DeviceSchedules";
import DeviceView from "../../../src/components/assets/device/DeviceView";
import { AlarmsContext } from "../../../src/context/AlarmsContext";
import { AssetsContext } from "../../../src/context/AssetsContext";
import {
	ValuesContext,
	ValueContextEmitter
} from "../../../src/context/ValuesContext";
import {
	ActionTrigger,
	AlarmType,
	DeviceOnlineStatus,
	DeviceType,
	MeasurementType
} from "../../../src/interface/Asset";
import type { Asset, Device, Measurement } from "../../../src/interface/Asset";
import type { Alarm } from "../../../src/interface/Alarm";

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
	alarms: [{ name: "High temperature", type: AlarmType.ValueUpperLimit, limit: 30 }],
	schedules: [{ name: "Morning", cron: "0 8 * * *", value: 20 }],
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

const asset: Asset = {
	id: "asset-1",
	name: "Home",
	icon: "home",
	devices: [device]
};

const activeAlarm: Alarm = {
	assetId: asset.id,
	assetName: asset.name,
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
	currentAsset: Asset = asset
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
			<AssetsContext.Provider value={{ assets: [currentAsset] }}>
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
		"/assets/asset-1/device-1/actions",
		<Routes>
			<Route
				path="/assets/:assetId/:deviceId/actions"
				element={<DeviceActions />}
			/>
		</Routes>
	);

	expect(screen.getByText("Notify")).toBeTruthy();
	expect(screen.getByText("Arvon muuttuessa")).toBeTruthy();
});

test("Device alarms distinguish active alarms from clear alarms", () => {
	renderDeviceRoute(
		"/assets/asset-1/device-1/alarms",
		<Routes>
			<Route
				path="/assets/:assetId/:deviceId/alarms"
				element={<DeviceAlarms />}
			/>
		</Routes>,
		[activeAlarm]
	);

	expect(screen.getByText("High temperature")).toBeTruthy();
	expect(screen.getByText("Alkanut 1 minuutti sitten")).toBeTruthy();
});

test("Device schedules show configured times and empty state", () => {
	renderDeviceRoute(
		"/assets/asset-1/device-1/schedules",
		<Routes>
			<Route
				path="/assets/:assetId/:deviceId/schedules"
				element={<DeviceSchedules />}
			/>
		</Routes>
	);

	expect(screen.getByText("Morning")).toBeTruthy();
	expect(screen.getByText("0 8 * * *")).toBeTruthy();
});

test("Device summary renders values and navigates to history", async () => {
	renderDeviceRoute(
		"/assets/asset-1",
		<Routes>
			<Route path="/assets/:assetId" element={<DeviceView asset={asset} device={device} />} />
			<Route path="/assets/:assetId/:deviceId" element={<p>History view</p>} />
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
	const emptyAsset = { ...asset, devices: [emptyDevice] };
	const routes = (
		<Routes>
			<Route
				path="/assets/:assetId/:deviceId/actions"
				element={<DeviceActions />}
			/>
			<Route
				path="/assets/:assetId/:deviceId/alarms"
				element={<DeviceAlarms />}
			/>
			<Route
				path="/assets/:assetId/:deviceId/schedules"
				element={<DeviceSchedules />}
			/>
		</Routes>
	);
	renderDeviceRoute("/assets/asset-1/device-1/actions", routes, [], emptyAsset);
	expect(screen.getByText("Ei toimintoja.")).toBeTruthy();

	cleanup();
	renderDeviceRoute("/assets/asset-1/device-1/alarms", routes, [], emptyAsset);
	expect(screen.getByText("Ei hälytyksiä.")).toBeTruthy();

	cleanup();
	renderDeviceRoute(
		"/assets/asset-1/device-1/schedules",
		routes,
		[],
		emptyAsset
	);
	expect(screen.getByText("Ei ajastuksia.")).toBeTruthy();
});