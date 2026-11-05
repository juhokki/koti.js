import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Alarms from "../../src/components/alarms/Alarms";
import AssetRoute from "../../src/components/assets/AssetRoute";
import AssetView from "../../src/components/assets/AssetView";
import Home from "../../src/components/home/Home";
import { AlarmsContext } from "../../src/context/AlarmsContext";
import { AssetsContext } from "../../src/context/AssetsContext";
import {
	ValuesContext,
	ValueContextEmitter
} from "../../src/context/ValuesContext";
import {
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
	id: "root",
	name: "Home",
	icon: "home",
	links: [],
	devices: [device]
};
const emptyAsset: Asset = {
	id: "empty-asset",
	name: "Empty asset",
	icon: "home",
	links: [],
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
						<Route path="/assets" element={<p>Asset route</p>} />
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

test("Assets renders the hardcoded root and navigates through its links", async () => {
	const rootAsset: Asset = { ...asset, links: ["child-1"], devices: [] };
	const childAsset: Asset = {
		...emptyAsset,
		id: "child-1",
		name: "Child asset"
	};

	render(
		<AssetsContext.Provider
			value={{ assets: [emptyAsset, rootAsset, childAsset] }}
		>
			<MemoryRouter initialEntries={["/assets"]}>
				<Routes>
					<Route path="/assets" element={<AssetView />} />
					<Route path="/assets/*" element={<AssetRoute />} />
				</Routes>
			</MemoryRouter>
		</AssetsContext.Provider>
	);

	expect(screen.getByText("Home")).toBeTruthy();
	expect(screen.queryByText("Empty asset")).toBeNull();
	fireEvent.click(screen.getByText("Child asset"));
	expect(await screen.findByText("Child asset")).toBeTruthy();
});

test("Asset details omits devices without measurements", () => {
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
				<MemoryRouter initialEntries={["/assets"]}>
					<Routes>
						<Route path="/assets/*" element={<AssetView />} />
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

test("Asset details renders regular device cards and all measurements", () => {
	const otherMeasurement: Measurement = {
		...measurement,
		id: "humidity",
		name: "Humidity",
		unit: "%"
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
	const regularAsset: Asset = {
		...asset,
		devices: [filteredDevice, otherDevice]
	};
	const values = new ValueContextEmitter();
	values.set("device-1-temperature", {
		deviceId: device.id,
		measurementId: measurement.id,
		value: 22,
		time: Date.now()
	});
	values.set("device-1-humidity", {
		deviceId: device.id,
		measurementId: otherMeasurement.id,
		value: 45,
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
			<AssetsContext.Provider value={{ assets: [regularAsset] }}>
				<MemoryRouter initialEntries={["/assets"]}>
					<Routes>
						<Route path="/assets/*" element={<AssetView />} />
					</Routes>
				</MemoryRouter>
			</AssetsContext.Provider>
		</ValuesContext.Provider>
	);

	expect(screen.getByText("Living room")).toBeTruthy();
	expect(screen.getByText("Kitchen")).toBeTruthy();
	expect(screen.getByText("Temperature")).toBeTruthy();
	expect(screen.getAllByText("Humidity")).toHaveLength(2);
	expect(screen.getAllByText("45 %")).toHaveLength(2);
	expect(document.querySelectorAll(".grid-item")).toHaveLength(2);
});

test("Summary renders selected readings beside regular device cards", () => {
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
		devices: [device],
		summary: {
			devices: [
				{
					device: otherDevice,
					displayName: "Kitchenette",
					measurements: [otherMeasurement]
				}
			]
		}
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
				<MemoryRouter initialEntries={["/assets"]}>
					<Routes>
						<Route path="/assets/*" element={<AssetView />} />
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
	expect(screen.getAllByTitle("Päivitetty")).toHaveLength(1);
	expect(
		document
			.querySelector(".grid-item.full-width table tbody tr:first-child")
			?.querySelectorAll("th, td")
	).toHaveLength(3);
	expect(document.querySelectorAll(".grid-item")).toHaveLength(2);
	const updatedHeader = document.querySelector(
		".grid-item.full-width thead th.hide-on-small-screen"
	);
	expect(updatedHeader).not.toBeNull();
	expect(updatedHeader?.className).toContain("hide-on-small-screen");
	expect(
		screen.getAllByTitle("Päivitetty")[0]?.parentElement?.className
	).toContain("hide-on-small-screen");
});
test("Asset details renders linked assets as navigation boxes", async () => {
	const parent: Asset = { ...asset, links: ["child-1"], devices: [] };
	const child: Asset = {
		...emptyAsset,
		id: "child-1",
		name: "Child asset",
		devices: [device]
	};
	render(
		<ValuesContext.Provider value={{ values: new ValueContextEmitter() }}>
			<AssetsContext.Provider value={{ assets: [parent, child] }}>
				<MemoryRouter initialEntries={["/assets"]}>
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
