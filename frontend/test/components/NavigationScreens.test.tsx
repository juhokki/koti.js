import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Alarms from "../../src/components/alarms/Alarms";
import AssetRoute from "../../src/components/assets/AssetRoute";
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
	ActionTrigger,
	DeviceOnlineStatus,
	DeviceType,
	MeasurementType
} from "../../src/interface/Asset";
import type { Asset, Device, Measurement } from "../../src/interface/Asset";
import { AlarmType, type Alarm } from "../../src/interface/Alarm";

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
	isRootAsset: true,
	children: [],
	devices: [device]
};
const emptyAsset: Asset = {
	id: "empty-asset",
	name: "Empty asset",
	icon: "home",
	isRootAsset: false,
	children: [],
	devices: []
};
const alarm: Alarm = {
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
	const renderAlarms = (alarms: Alarm[] | null) => (
		<MemoryRouter>
			<AssetsContext.Provider value={{ assets: [asset] }}>
				<AlarmsContext.Provider value={{ alarms }}>
					<Alarms />
				</AlarmsContext.Provider>
			</AssetsContext.Provider>
		</MemoryRouter>
	);
	const { rerender } = render(renderAlarms(null));
	expect(document.querySelector(".loader")).toBeTruthy();

	rerender(renderAlarms([]));
	expect(screen.getByText("Ei aktiivisia hälytyksiä.")).toBeTruthy();

	rerender(renderAlarms([alarm]));
	expect(screen.getByText("High temperature")).toBeTruthy();
	expect(screen.getByText("Home")).toBeTruthy();
	expect(screen.getByRole("columnheader", { name: "Alkanut" })).toBeTruthy();

	const initialWidth = window.innerWidth;
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 800
	});
	fireEvent(window, new Event("resize"));

	expect(screen.queryByRole("columnheader", { name: "Alkanut" })).toBeNull();
	expect(
		document.querySelector("tbody tr")?.querySelectorAll("td")
	).toHaveLength(2);

	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: initialWidth
	});
	fireEvent(window, new Event("resize"));
});

test("Alarm assets link back to details with alarm origin preserved", async () => {
	render(
		<AssetsContext.Provider value={{ assets: [asset] }}>
			<AlarmsContext.Provider value={{ alarms: [alarm] }}>
				<MemoryRouter initialEntries={["/alarms"]}>
					<Routes>
						<Route path="/alarms" element={<Alarms />} />
						<Route path="/assets/*" element={<p>Asset route</p>} />
					</Routes>
				</MemoryRouter>
			</AlarmsContext.Provider>
		</AssetsContext.Provider>
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
					<Route
						path="/shoppinglist/*"
						element={<p>Shopping route</p>}
					/>
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

test("Assets lists only root assets and navigates to one", async () => {
	render(
		<AssetsContext.Provider value={{ assets: [emptyAsset, asset] }}>
			<MemoryRouter initialEntries={["/assets"]}>
				<Routes>
					<Route path="/assets" element={<Assets />} />
					<Route
						path="/assets/*"
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
						<Route path="/assets/*" element={<AssetDetails />} />
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

test("Asset details applies device name overrides and measurement filters", () => {
	const otherMeasurement = {
		...measurement,
		id: "humidity",
		name: "Humidity",
		actions: [
			{
				name: "Hidden action",
				trigger: ActionTrigger.OnChange,
				script: ""
			}
		]
	};
	const filteredDevice = {
		...device,
		measurements: [measurement, otherMeasurement]
	};
	const otherDevice = {
		...device,
		id: "device-2",
		name: "Kitchen",
		measurements: [otherMeasurement]
	};
	const filteredAsset: Asset = {
		...asset,
		deviceNameOverrides: [{ id: filteredDevice.id, name: "Main room" }],
		measurementFilter: measurement.id,
		devices: [filteredDevice, otherDevice]
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
			<AssetsContext.Provider value={{ assets: [filteredAsset] }}>
				<MemoryRouter initialEntries={["/assets/asset-1"]}>
					<Routes>
						<Route path="/assets/*" element={<AssetDetails />} />
					</Routes>
				</MemoryRouter>
			</AssetsContext.Provider>
		</ValuesContext.Provider>
	);

	expect(screen.getByText("Main room")).toBeTruthy();
	expect(screen.queryByText("Living room")).toBeNull();
	expect(screen.queryByText("Kitchen")).toBeNull();
	expect(screen.getByText("Temperature")).toBeTruthy();
	expect(screen.queryByText("Humidity")).toBeNull();
	expect(screen.queryByText("Toiminnot")).toBeNull();
	expect(
		document
			.querySelector(".grid-item table tbody tr:first-child")
			?.querySelectorAll("td")
	).toHaveLength(1);
});

test("Summary asset renders filtered readings in one box", () => {
	const otherMeasurement = {
		...measurement,
		deviceId: "device-2",
		id: "humidity",
		name: "Humidity",
		unit: "%"
	};
	const otherDevice = {
		...device,
		id: "device-2",
		name: "Kitchen",
		measurements: [otherMeasurement]
	};
	const summaryAsset: Asset = {
		...asset,
		isSummaryAsset: true,
		deviceNameOverrides: [{ id: otherDevice.id, name: "Kitchenette" }],
		devices: [device, otherDevice]
	};
	const values = new ValueContextEmitter();
	values.set("device-1-temperature", {
		deviceId: device.id,
		measurementId: measurement.id,
		value: 22,
		time: Date.now()
	});
	values.set("device-2-humidity", {
		deviceId: otherDevice.id,
		measurementId: otherMeasurement.id,
		value: 45,
		time: Date.now()
	});

	render(
		<ValuesContext.Provider value={{ values }}>
			<AssetsContext.Provider value={{ assets: [summaryAsset] }}>
				<MemoryRouter initialEntries={["/assets/asset-1"]}>
					<Routes>
						<Route path="/assets/*" element={<AssetDetails />} />
					</Routes>
				</MemoryRouter>
			</AssetsContext.Provider>
		</ValuesContext.Provider>
	);

	expect(screen.getByRole("columnheader", { name: "Kohde" })).toBeTruthy();
	expect(screen.getByRole("columnheader", { name: "Arvo" })).toBeTruthy();
	expect(screen.getByText("Living room")).toBeTruthy();
	expect(screen.getByText("Kitchenette")).toBeTruthy();
	expect(screen.getByText("22 C")).toBeTruthy();
	expect(screen.getByText("45 %")).toBeTruthy();
	expect(screen.getAllByTitle("Päivitetty")).toHaveLength(2);
	expect(
		document.querySelectorAll(".grid-item table tbody tr:first-child td")
	).toHaveLength(2);
	expect(document.querySelectorAll(".grid-item")).toHaveLength(1);

	const initialWidth = window.innerWidth;
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 800
	});
	fireEvent(window, new Event("resize"));

	expect(
		screen.queryByRole("columnheader", { name: "Päivitetty" })
	).toBeNull();
	expect(screen.queryByTitle("Päivitetty")).toBeNull();

	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: initialWidth
	});
	fireEvent(window, new Event("resize"));
});
test("Asset details renders child assets as navigation boxes", async () => {
	const parent: Asset = { ...asset, children: ["child-1"], devices: [] };
	const child: Asset = {
		...emptyAsset,
		id: "child-1",
		name: "Child asset",
		devices: [device]
	};
	render(
		<ValuesContext.Provider value={{ values: new ValueContextEmitter() }}>
			<AssetsContext.Provider value={{ assets: [parent, child] }}>
				<MemoryRouter initialEntries={["/assets/asset-1"]}>
					<Routes>
						<Route path="/assets/*" element={<AssetRoute />} />
					</Routes>
				</MemoryRouter>
			</AssetsContext.Provider>
		</ValuesContext.Provider>
	);

	fireEvent.click(screen.getByText("Child asset"));
	expect(await screen.findByText("Living room")).toBeTruthy();
	expect(
		screen.queryByText("Child asset", { selector: "h3 span" })
	).toBeNull();
});
