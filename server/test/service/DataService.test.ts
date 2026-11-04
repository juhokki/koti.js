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
import * as Messages from "../../src/constants/Messages.js";

const mockReadLatestValues = vi.hoisted(() => vi.fn());
const mockReadValueRange = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());
const mockGetMeasurement = vi.hoisted(() => vi.fn());
const mockControl = vi.hoisted(() => vi.fn());

vi.mock("../../src/service/data/database/DatabaseFactory.js", () => ({
	default: vi.fn().mockImplementation(function () {
		return {
			create: () => ({
				start: () => Promise.resolve(),
				stop: () => Promise.resolve(),
				readLatestValues: mockReadLatestValues,
				readValueRange: mockReadValueRange,
				write: mockWrite
			})
		};
	})
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

test("Reported numeric values are written regardless of configured steps and bounds", async () => {
	const service = new DataService(services, settings);
	const measurement = new Measurement(
		"device-1",
		"meas-1",
		"",
		MeasurementType.Number,
		"",
		"",
		false,
		0,
		100,
		[],
		[],
		[],
		[10, 20, 30]
	);
	const mockEmit = vi.fn();
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));
	mockGetMeasurement
		.mockReturnValueOnce(measurement)
		.mockReturnValueOnce(measurement);
	service.on(Messages.VALUE_UPDATED, mockEmit);

	await service.start();
	await service.write([new Value("device-1", "meas-1", 20)]);
	await service.write([new Value("device-1", "meas-1", 101)]);

	expect(service.readLatestValue("device-1", "meas-1")?.value).toBe(101);
	expect(mockWrite).toHaveBeenLastCalledWith([
		expect.objectContaining({ value: 101 })
	]);
	expect(mockEmit).toHaveBeenCalledTimes(2);
	expect(mockWrite).toHaveBeenCalledTimes(2);
});

test("Reports values received over the rolling last minute", async () => {
	vi.setSystemTime(now);
	const service = new DataService(services, settings);
	const measurement = new Measurement(
		"device-1",
		"meas-1",
		"",
		MeasurementType.Number,
		"",
		""
	);
	mockGetMeasurement
		.mockReturnValueOnce(measurement)
		.mockReturnValueOnce(measurement)
		.mockReturnValueOnce(measurement);

	await service.write([
		new Value("device-1", "meas-1", 1),
		new Value("device-1", "meas-1", 2)
	]);
	vi.advanceTimersByTime(30_000);
	await service.write([new Value("device-1", "meas-1", 3)]);

	const getIncomingCount = () =>
		service
			.getParameters()
			.find(
				(parameter) => parameter.name === "Incoming values per minute"
			)?.value;
	expect(getIncomingCount()).toBe(3);

	vi.advanceTimersByTime(30_000);
	expect(getIncomingCount()).toBe(1);
});

test("Wrong value types are not written", async () => {
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

	const values = [new Value("device-1", "meas-1", true)];

	await service.write(values);

	expect(mockWrite).not.toHaveBeenCalled();
});

test("Values for unconfigured measurements are ignored", async () => {
	const service = new DataService(services, settings);
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));
	mockGetMeasurement.mockImplementationOnce(() => {
		throw new Error("Measurement not found");
	});

	await service.start();
	await service.write([new Value("device-1", "missing", 1)]);

	expect(mockWrite).not.toHaveBeenCalled();
});

test("Unchanged values are not written or emitted", async () => {
	const currentValue = new Value("device-1", "meas-1", 1);
	const service = new DataService(services, settings);
	const mockEmit = vi.fn();
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([currentValue]));
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
	service.on(Messages.VALUE_UPDATED, mockEmit);

	await service.start();
	await service.write([new Value("device-1", "meas-1", 1)]);

	expect(mockWrite).not.toHaveBeenCalled();
	expect(mockEmit).not.toHaveBeenCalled();
});

test("Counter values accumulate from the cached value", async () => {
	const currentValue = new Value("device-1", "meas-1", 5);
	const nextValue = new Value("device-1", "meas-1", 2);
	const service = new DataService(services, settings);
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([currentValue]));
	mockGetMeasurement.mockReturnValueOnce(
		new Measurement(
			"device-1",
			"meas-1",
			"",
			MeasurementType.Counter,
			"",
			""
		)
	);

	await service.start();
	await service.write([nextValue]);

	expect(nextValue.value).toBe(7);
	expect(service.readLatestValue("device-1", "meas-1")).toBe(nextValue);
	expect(mockWrite).toHaveBeenLastCalledWith([nextValue]);
});

test("String and boolean measurement values are accepted", async () => {
	const service = new DataService(services, settings);
	const values = [
		new Value("device-1", "string-meas", "ready"),
		new Value("device-1", "boolean-meas", true)
	];
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));
	mockGetMeasurement
		.mockReturnValueOnce(
			new Measurement(
				"device-1",
				"string-meas",
				"",
				MeasurementType.String,
				"",
				""
			)
		)
		.mockReturnValueOnce(
			new Measurement(
				"device-1",
				"boolean-meas",
				"",
				MeasurementType.Boolean,
				"",
				""
			)
		);

	await service.start();
	await service.write(values);

	expect(mockWrite).toHaveBeenLastCalledWith(values);
});

test("Database write failures do not reject the value update", async () => {
	const service = new DataService(services, settings);
	mockReadLatestValues.mockReturnValueOnce(Promise.resolve([]));
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
	mockWrite.mockRejectedValueOnce(new Error("Database unavailable"));

	await service.start();
	await expect(
		service.write([new Value("device-1", "meas-1", 1)])
	).resolves.toBeUndefined();
});

test("Control emits value", async () => {
	const value = new Value("device-1", "meas-1", 1);
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

	await service.control(value);

	expect(mockControl).toHaveBeenCalledWith(
		value.deviceId,
		value.measurementId,
		value
	);
});

test("Controls allow configured steps and reject values outside them", async () => {
	const service = new DataService(services, settings);
	const measurement = new Measurement(
		"device-1",
		"meas-1",
		"",
		MeasurementType.Number,
		"",
		"",
		true,
		undefined,
		undefined,
		[],
		[],
		[],
		[10, 20]
	);
	mockGetMeasurement
		.mockReturnValueOnce(measurement)
		.mockReturnValueOnce(measurement);
	const allowedValue = new Value("device-1", "meas-1", 20);
	const rejectedValue = new Value("device-1", "meas-1", 5);

	await service.control(allowedValue);
	expect(mockControl).toHaveBeenCalledWith(
		allowedValue.deviceId,
		allowedValue.measurementId,
		allowedValue
	);

	await expect(service.control(rejectedValue)).rejects.toThrow(
		"Value 5 is not allowed"
	);
	expect(mockControl).toHaveBeenCalledTimes(1);
});

test("Controls reject values outside configured min and max bounds", async () => {
	const service = new DataService(services, settings);
	const measurement = new Measurement(
		"device-1",
		"meas-1",
		"",
		MeasurementType.Number,
		"",
		"",
		true,
		10,
		20
	);
	mockGetMeasurement
		.mockReturnValueOnce(measurement)
		.mockReturnValueOnce(measurement);
	const allowedValue = new Value("device-1", "meas-1", 20);
	const rejectedValue = new Value("device-1", "meas-1", 21);

	await service.control(allowedValue);
	await expect(service.control(rejectedValue)).rejects.toThrow(
		"Value 21 is not allowed"
	);

	expect(mockControl).toHaveBeenCalledTimes(1);
});
