import type { ShellyDevice, ShellyDevicePlugS } from "shellies";
import { expect, test, vi } from "vitest";
import DeviceType from "../../src/constants/DeviceType.ts";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";
import ShellyIntegration from "../../src/service/integration/shelly/ShellyIntegration.js";
import type ShellyIntegrationSettings from "../../src/service/integration/shelly/ShellyIntegrationConfig.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";

const mockShelliesOn = vi.hoisted(() => vi.fn());
const mockShelliesStart = vi.hoisted(() => vi.fn());
const mockShelliesStop = vi.hoisted(() => vi.fn());
vi.mock("shellies", () => ({
	default: {
		on: mockShelliesOn,
		start: mockShelliesStart,
		stop: mockShelliesStop
	}
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock("node-fetch", () => ({ default: mockFetch }));

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const settings = {
	enabled: true,
	name: "ShellyIntegration"
} satisfies ShellyIntegrationSettings;

const mockGetDevice = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());
const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getDevice: mockGetDevice
			} as unknown as AssetService
		],
		[
			"DataService",
			{
				write: mockWrite
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

test("ShellyIntegration is created", () => {
	const integration = new ShellyIntegration(services, settings);

	expect(integration).not.toBe(null);
});

test("ShellyIntegration starts and stops shellies", async () => {
	const integration = new ShellyIntegration(services, settings);

	await integration.start();

	expect(mockShelliesStart).toHaveBeenCalled();

	await integration.stop();

	expect(mockShelliesStop).toHaveBeenCalled();
});

test("ShellyIntegration starts discovery", async () => {
	const integration = new ShellyIntegration(services, settings);
	const mockShellyDevice: ShellyDevicePlugS = {
		id: "device-1",
		host: "",
		type: "SHPLG-S",
		on: (
			change: string,
			callback: (prop: string, value: number | boolean) => void
		) => {
			/* Do nothing */
		},
		power0: 10,
		relay0: true
	};

	mockGetDevice.mockReturnValue(
		new Device(
			"device-1",
			DeviceType.ShellyIntegration,
			"TestDevice",
			"icon",
			[
				new Measurement(
					"device-1",
					"relay0",
					"name",
					MeasurementType.Boolean,
					"unit",
					"icon"
				),
				new Measurement(
					"device-1",
					"power0",
					"name",
					MeasurementType.Number,
					"unit",
					"icon"
				)
			]
		)
	);

	mockShelliesOn.mockImplementation(
		(topic: string, callback: (shellyDevice: ShellyDevice) => void) => {
			callback(mockShellyDevice);
		}
	);

	mockWrite.mockReturnValue(Promise.resolve());

	const spy = vi.spyOn(integration, "onDeviceDiscovered");

	await integration.start();

	expect(spy).toHaveBeenCalledWith(mockShellyDevice);
});

test("Discovered device writes initial values and changed values", () => {
	let onValueUpdatedCallback:
		| ((prop: string, value: number | boolean) => void)
		| undefined;

	const integration = new ShellyIntegration(services, settings);
	const mockShellyDevice: ShellyDevicePlugS = {
		id: "device-1",
		host: "",
		type: "SHPLG-S",
		on: (
			change: string,
			callback: (prop: string, value: number | boolean) => void
		) => {
			onValueUpdatedCallback = callback;
		},
		power0: 10,
		relay0: true
	};

	mockGetDevice.mockReturnValue(
		new Device(
			"device-1",
			DeviceType.ShellyIntegration,
			"TestDevice",
			"icon",
			[
				new Measurement(
					"device-1",
					"relay0",
					"name",
					MeasurementType.Boolean,
					"unit",
					"icon"
				),
				new Measurement(
					"device-1",
					"power0",
					"name",
					MeasurementType.Number,
					"unit",
					"icon"
				)
			]
		)
	);

	mockWrite.mockReturnValue(Promise.resolve());

	integration.onDeviceDiscovered(mockShellyDevice);

	expect(mockWrite).toHaveBeenCalledTimes(2);
	expect(mockWrite).toHaveBeenNthCalledWith(1, [
		expect.objectContaining({
			deviceId: "device-1",
			measurementId: "relay0",
			value: true
		})
	]);
	expect(mockWrite).toHaveBeenNthCalledWith(2, [
		expect.objectContaining({
			deviceId: "device-1",
			measurementId: "power0",
			value: 10
		})
	]);

	if (onValueUpdatedCallback) {
		onValueUpdatedCallback("power0", 11);
	}

	expect(mockWrite).toHaveBeenCalledTimes(3);
	expect(mockWrite).toHaveBeenNthCalledWith(3, [
		expect.objectContaining({
			deviceId: "device-1",
			measurementId: "power0",
			value: 11
		})
	]);
});

test("ShellyIntegration controls device", async () => {
	const integration = new ShellyIntegration(services, settings);
	const mockShellyDevice: ShellyDevicePlugS = {
		id: "device-1",
		type: "SHPLG-S",
		on: (
			change: string,
			callback: (prop: string, value: number | boolean) => void
		) => {
			/* Do nothing */
		},
		power0: 10,
		relay0: false,
		host: "http://test"
	};

	mockShelliesOn.mockImplementation(
		(topic: string, callback: (shellyDevice: ShellyDevice) => void) => {
			callback(mockShellyDevice);
		}
	);

	mockWrite.mockReturnValue(Promise.resolve());

	mockFetch.mockReturnValue({
		json: () => {
			/* Do nothing */
		}
	});

	await integration.start();

	const measurements: [Measurement, Measurement] = [
		new Measurement(
			"device-1",
			"relay0",
			"name",
			MeasurementType.Boolean,
			"unit",
			"icon"
		),
		new Measurement(
			"device-1",
			"power0",
			"name",
			MeasurementType.Number,
			"unit",
			"icon"
		)
	];
	const device = new Device(
		"device-1",
		DeviceType.ShellyIntegration,
		"TestDevice",
		"icon",
		measurements
	);

	await integration.control(
		device.id,
		measurements[0].id,
		new Value("device-1", "relay0", true)
	);

	const params = new URLSearchParams();
	params.append("turn", "on");

	expect(mockFetch).toHaveBeenLastCalledWith("http://http://test/relay/0", {
		method: "POST",
		body: params
	});
});
