import { vi, expect, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import DataService from "../../src/service/data/DataService.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type DataServiceSettings from "../../src/service/data/DataServiceSettings.js";
import type TimescaleDatabaseSettings from "../../src/service/data/database/timescale/TimescaleDatabaseSettings.js";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import type IntegrationService from "../../src/service/integration/IntegrationService.js";

const mockReadLatestValues = vi.hoisted(() => vi.fn());
const mockReadValueRange = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());
const mockGetMeasurement = vi.hoisted(() => vi.fn());
const mockControl = vi.hoisted(() => vi.fn());

vi.mock("../../src/service/data/database/DatabaseFactory.js", () => ({
	default: vi.fn().mockImplementation(() => ({
		create: () => ({
			start: () => Promise.resolve(),
			stop: () => Promise.resolve(),
			readLatestValues: mockReadLatestValues,
			readValueRange: mockReadValueRange,
			write: mockWrite
		})
	}))
}));

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getMeasurement: mockGetMeasurement
			} as unknown as AssetService
		],
		[
			"IntegrationService",
			{
				onValueControlled: mockControl
			} as unknown as IntegrationService
		]
	] as [string, ServiceBase][])
);

const settings = {
	database: {
		type: "timescale",
		settings: {
			host: "",
			port: 0,
			database: "",
			user: "",
			password: ""
		} satisfies TimescaleDatabaseSettings
	}
} satisfies DataServiceSettings;

test("DataService is created", () => {
	const service = new DataService(services, settings);
	expect(service).not.toBe(null);
});

test("Can be started and stopped", async () => {
	const service = new DataService(services, settings);

	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));

	await service.start();
	await service.stop();
});

test("Latest values are read on start", async () => {
	const value1 = new Value("device-1", "meas-1", 1);
	const value2 = new Value("device-2", "meas-2", 2);
	const service = new DataService(services, settings);

	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([value1, value2]));

	await service.start();

	expect(service.readLatestValues().length).toBe(2);
	expect(service.readLatestValue("device-1", "meas-1")).toBe(value1);
	expect(service.readLatestValue("device-2", "meas-2")).toBe(value2);
});

test("Reads device values", async () => {
	const deviceId = "device-1";
	const queryStartTime = now - 1000;
	const queryEndTime = now + 1000;
	const value1 = new Value(deviceId, "meas-1", 1, now);
	const value2 = new Value(deviceId, "meas-2", 2, now);
	const service = new DataService(services, settings);

	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));
	mockReadValueRange.mockReturnValueOnce(Promise.resolve([value1, value2]));

	await service.start();

	expect(
		(await service.readDeviceValues(deviceId, queryStartTime, queryEndTime))
			.length
	).toBe(2);

	expect(mockReadValueRange).toHaveBeenLastCalledWith(
		deviceId,
		queryStartTime,
		queryEndTime
	);
});

test("DataService writes values", async () => {
	const service = new DataService(services, settings);

	mockGetMeasurement.mockReturnValueOnce(
		new Measurement(
			"device-1",
			"meas-1",
			"",
			MeasurementType.Number,
			"",
			""
		)
	);
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));
	mockWrite.mockReturnValueOnce(Promise.resolve());

	await service.start();

	const values = [new Value("device-1", "meas-1", 1)];

	await service.write(values);

	expect(mockWrite).toHaveBeenLastCalledWith(values);
});

test("Control emits value", async () => {
	const value = new Value("device-1", "meas-1", 1);
	const service = new DataService(services, settings);

	await service.control(value);

	expect(mockControl).toHaveBeenCalledWith(
		value.deviceId,
		value.measurementId,
		value
	);
});
