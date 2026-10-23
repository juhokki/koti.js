import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DeviceHistory from "../../../src/components/assets/device/DeviceHistory";
import ValueView from "../../../src/components/assets/device/ValueView";
import { AssetsContext } from "../../../src/context/AssetsContext";
import {
	ValuesContext,
	ValueContextEmitter
} from "../../../src/context/ValuesContext";
import {
	DeviceOnlineStatus,
	DeviceType,
	MeasurementType
} from "../../../src/interface/Asset";
import type {
	Asset,
	Device,
	Measurement
} from "../../../src/interface/Asset";
import type { Value } from "../../../src/interface/Value";

const mockGetDeviceValues = vi.hoisted(() => vi.fn());
const mockControl = vi.hoisted(() => vi.fn());

vi.mock("../../../src/api/ValuesApi", () => ({
	default: {
		getDeviceValues: mockGetDeviceValues,
		control: mockControl
	}
}));

vi.mock("../../../src/components/assets/device/DeviceChart", async () => {
	const { createElement } = await vi.importActual<typeof import("react")>("react");
	return {
		default: ({
			measurement,
			data
		}: {
			measurement: { id: string };
			data: { datasets: { data: unknown[] }[] };
		}) =>
			createElement(
				"div",
				{ "data-testid": `chart-${measurement.id}` },
				String(data.datasets[0]?.data.length ?? 0)
			)
	};
});

const numberMeasurement: Measurement = {
	deviceId: "device-1",
	id: "temperature",
	name: "Temperature",
	type: MeasurementType.Number,
	unit: "C",
	icon: "thermostat",
	controllable: false,
	min: 0,
	max: 40,
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
	measurements: [numberMeasurement],
	onlineStatus: DeviceOnlineStatus.ONLINE
};

const asset: Asset = {
	id: "asset-1",
	name: "Home",
	icon: "home",
	devices: [device]
};

beforeEach(() => {
	mockGetDeviceValues.mockReset();
	mockControl.mockReset();
});

function createValue(measurementId: string, value: string | number | boolean, time = 1): Value {
	return { deviceId: device.id, measurementId, value, time };
}

function renderValue(
	measurement: Measurement,
	currentValue?: Value,
	status = DeviceOnlineStatus.ONLINE
) {
	const values = new ValueContextEmitter();
	if (currentValue) {
		values.set(`${device.id}-${measurement.id}`, currentValue);
	}
	return render(
		<ValuesContext.Provider value={{ values }}>
			<ValueView
				device={{ ...device, onlineStatus: status }}
				measurement={measurement}
			/>
		</ValuesContext.Provider>
	);
}

function renderHistory() {
	return render(
		<AssetsContext.Provider value={{ assets: [asset] }}>
			<MemoryRouter initialEntries={["/assets/asset-1/device-1"]}>
				<Routes>
					<Route
						path="/assets/:assetId/:deviceId"
						element={<DeviceHistory />}
					/>
				</Routes>
			</MemoryRouter>
		</AssetsContext.Provider>
	);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

test("ValueView renders missing, numeric, string, and boolean values", () => {
	renderValue(numberMeasurement);
	expect(screen.getByText("Ei arvoa")).toBeTruthy();
	cleanup();

	renderValue(numberMeasurement, createValue("temperature", 22));
	expect(screen.getByText("22 C")).toBeTruthy();
	cleanup();

	renderValue(
		{ ...numberMeasurement, type: MeasurementType.String, unit: "" },
		createValue("temperature", "ready")
	);
	expect(screen.getByText("ready")).toBeTruthy();
	cleanup();

	renderValue(
		{ ...numberMeasurement, type: MeasurementType.Boolean, unit: "" },
		createValue("temperature", false)
	);
	expect(screen.getByText("Pois")).toBeTruthy();
});

test("Controllable boolean values update on success and retain the old value on failure", async () => {
	const measurement = {
		...numberMeasurement,
		type: MeasurementType.Boolean,
		controllable: true
	};
	mockControl.mockResolvedValueOnce({});
	renderValue(
		measurement,
		createValue("temperature", true)
	);
	const input = screen.getByRole("switch");

	fireEvent.click(input);
	await waitFor(() => {
		expect(input.checked).toBe(false);
	});
	expect(mockControl).toHaveBeenCalledWith("device-1", "temperature", false);

	cleanup();
	const errorLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
	mockControl.mockRejectedValueOnce(new Error("offline"));
	renderValue(measurement, createValue("temperature", true));
	const failedInput = screen.getByRole("switch");
	fireEvent.click(failedInput);
	await waitFor(() => {
		expect(mockControl).toHaveBeenLastCalledWith(
			"device-1",
			"temperature",
			false
		);
	});
	await waitFor(() => {
		expect(errorLog).toHaveBeenCalled();
	});
});

test("Disables a controllable value when its device is offline", () => {
	const measurement = {
		...numberMeasurement,
		type: MeasurementType.Boolean,
		controllable: true
	};
	renderValue(
		measurement,
		createValue("temperature", true),
		DeviceOnlineStatus.OFFLINE
	);

	expect(screen.getByRole("switch").getAttribute("disabled")).not.toBeNull();
});

test("DeviceHistory groups values into charts and changes the month", async () => {
	mockGetDeviceValues.mockResolvedValue([
		createValue("temperature", 18, 10),
		createValue("temperature", 20, 20),
		createValue("humidity", 45, 30)
	]);
	const historyDevice = {
		...device,
		measurements: [
			numberMeasurement,
			{ ...numberMeasurement, id: "humidity", name: "Humidity", icon: "water" }
		]
	};
	const historyAsset = { ...asset, devices: [historyDevice] };
	render(
		<AssetsContext.Provider value={{ assets: [historyAsset] }}>
			<MemoryRouter initialEntries={["/assets/asset-1/device-1"]}>
				<Routes>
					<Route
						path="/assets/:assetId/:deviceId"
						element={<DeviceHistory />}
					/>
				</Routes>
			</MemoryRouter>
		</AssetsContext.Provider>
	);

	expect(
		(await screen.findByTestId("chart-temperature")).textContent
	).toBe("2");
	expect(screen.getByTestId("chart-humidity").textContent).toBe("1");
	expect(mockGetDeviceValues).toHaveBeenCalledWith(
		"device-1",
		expect.any(Number),
		expect.any(Number)
	);

	const monthButtons = screen.getAllByTestId("ChevronLeftIcon");
	const previousMonthButton = monthButtons[1];
	expect(previousMonthButton).toBeDefined();
	if (previousMonthButton) {
		fireEvent.click(previousMonthButton);
	}
	await waitFor(() => {
		expect(mockGetDeviceValues).toHaveBeenCalledTimes(2);
	});
});

test("DeviceHistory shows empty and failed fetch states", async () => {
	mockGetDeviceValues.mockResolvedValueOnce([]);
	renderHistory();
	expect(
		await screen.findByText("Arvoja ei löytynyt haetulla aikavälillä.")
	).toBeTruthy();

	cleanup();
	const errorLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
	mockGetDeviceValues.mockRejectedValueOnce(new Error("offline"));
	renderHistory();
	expect(
		await screen.findByText("Tietojen hakeminen ei onnistunut.")
	).toBeTruthy();
	expect(errorLog).toHaveBeenCalled();
});