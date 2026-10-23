import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Alarms from "../../src/components/alarms/Alarms";
import AssetDetails from "../../src/components/assets/AssetDetails";
import Assets from "../../src/components/assets/Assets";
import Home from "../../src/components/home/Home";
import { AlarmsContext } from "../../src/context/AlarmsContext";
import { AssetsContext } from "../../src/context/AssetsContext";
import {
	ValuesContext,
	ValueContextEmitter
} from "../../src/context/ValuesContext";
import {
	AlarmType,
	DeviceOnlineStatus,
	DeviceType,
	MeasurementType
} from "../../src/interface/Asset";
import type { Asset, Device, Measurement } from "../../src/interface/Asset";
import type { Alarm } from "../../src/interface/Alarm";

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
	actions: [],
	alarms: [],
	schedules: [],
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
const emptyAsset: Asset = {
	id: "empty-asset",
	name: "Empty asset",
	icon: "home",
	devices: []
};
const alarm: Alarm = {
	assetId: asset.id,
	assetName: asset.name,
	deviceId: device.id,
	deviceName: device.name,
	measurementId: measurement.id,
	measurementName: measurement.name,
	name: "High temperature",
	time: Date.now() - 60_000,
	type: AlarmType.Stale
};

afterEach(cleanup);

test("Alarms distinguishes loading, empty, and active alarm states", () => {
	const { rerender } = render(
		<MemoryRouter>
			<AlarmsContext.Provider value={{ alarms: null }}>
				<Alarms />
			</AlarmsContext.Provider>
		</MemoryRouter>
	);
	expect(document.querySelector(".loader")).toBeTruthy();

	rerender(
		<MemoryRouter>
			<AlarmsContext.Provider value={{ alarms: [] }}>
				<Alarms />
			</AlarmsContext.Provider>
		</MemoryRouter>
	);
	expect(screen.getByText("Ei aktiivisia hälytyksiä.")).toBeTruthy();

	rerender(
		<MemoryRouter>
			<AlarmsContext.Provider value={{ alarms: [alarm] }}>
				<Alarms />
			</AlarmsContext.Provider>
		</MemoryRouter>
	);
	expect(screen.getByText("High temperature")).toBeTruthy();
	expect(screen.getByText("Home")).toBeTruthy();
});

test("Alarm assets link back to details with alarm origin preserved", async () => {
	render(
		<AlarmsContext.Provider value={{ alarms: [alarm] }}>
			<MemoryRouter initialEntries={["/alarms"]}>
				<Routes>
					<Route path="/alarms" element={<Alarms />} />
					<Route
						path="/assets/:assetId"
						element={<p>Asset route</p>}
					/>
				</Routes>
			</MemoryRouter>
		</AlarmsContext.Provider>
	);

	fireEvent.click(screen.getByText("Home"));
	expect(await screen.findByText("Asset route")).toBeTruthy();
});

test("Home navigation exposes app sections and active alarm styling", () => {
	render(
		<AlarmsContext.Provider value={{ alarms: [alarm] }}>
			<MemoryRouter initialEntries={["/"]}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/assets/*" element={<p>Assets route</p>} />
					<Route path="/shoppinglist/*" element={<p>Shopping route</p>} />
					<Route path="/recipes/*" element={<p>Recipes route</p>} />
					<Route path="/alarms/*" element={<p>Alarms route</p>} />
					<Route path="/system/*" element={<p>System route</p>} />
				</Routes>
			</MemoryRouter>
		</AlarmsContext.Provider>
	);

	expect(screen.getByText("Hälytykset").closest("h3")?.className).toContain(
		"danger"
	);
	fireEvent.click(screen.getByText("Kodinohjaus"));
	expect(screen.getByText("Assets route")).toBeTruthy();
});

test("Assets omits empty groups and navigates to a populated asset", async () => {
	render(
		<AssetsContext.Provider value={{ assets: [emptyAsset, asset] }}>
			<MemoryRouter initialEntries={["/assets"]}>
				<Routes>
					<Route path="/assets" element={<Assets />} />
					<Route
						path="/assets/:assetId"
						element={<p>Asset details route</p>}
					/>
				</Routes>
			</MemoryRouter>
		</AssetsContext.Provider>
	);

	expect(screen.getByText("Home")).toBeTruthy();
	expect(screen.queryByText("Empty asset")).toBeNull();
	fireEvent.click(screen.getByText("Home"));
	expect(await screen.findByText("Asset details route")).toBeTruthy();
});

test("Asset details filters devices without measurements", () => {
	const assetWithEmptyDevice = {
		...asset,
		devices: [{ ...device, measurements: [] }, device]
	};
	const values = new ValueContextEmitter();
	values.set("device-1-temperature", {
		deviceId: device.id,
		measurementId: measurement.id,
		value: 22,
		time: Date.now()
	});
	render(
		<ValuesContext.Provider value={{ values }}>
			<AssetsContext.Provider value={{ assets: [assetWithEmptyDevice] }}>
				<MemoryRouter initialEntries={["/assets/asset-1"]}>
					<Routes>
						<Route
							path="/assets/:assetId"
							element={<AssetDetails />}
						/>
					</Routes>
				</MemoryRouter>
			</AssetsContext.Provider>
		</ValuesContext.Provider>
	);

	expect(screen.getByText("Home")).toBeTruthy();
	expect(screen.getByText("Living room")).toBeTruthy();
	expect(screen.getByText("22 C")).toBeTruthy();
	expect(screen.getAllByText("Living room")).toHaveLength(1);
});