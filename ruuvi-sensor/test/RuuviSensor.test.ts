import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type {
	RuuviTag,
	RuuviTagDataFormat2,
	RuuviTagDataFormat3,
	RuuviTagDataFormat5,
	RuuviTagDataFormat6
} from "node-ruuvitag";
import type RuuviSensorSettings from "../src/RuuviSensorSettings.ts";

const mockFetch = vi.hoisted(() => vi.fn());
const mockRuuviStart = vi.hoisted(() => vi.fn());
const mockRuuviStop = vi.hoisted(() => vi.fn());
const mockRuuviOn = vi.hoisted(() => vi.fn());
const mockReadConfigFile = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
	info: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
}));

vi.mock("node-fetch", () => ({
	default: mockFetch
}));

vi.mock("node-ruuvitag", () => ({
	default: {
		start: mockRuuviStart,
		stop: mockRuuviStop,
		on: mockRuuviOn
	}
}));

vi.mock("../src/util/FileUtil.ts", () => ({
	readConfigFile: mockReadConfigFile
}));

vi.mock("../src/util/logger.ts", () => ({
	default: mockLogger
}));

const { RuuviSensor, WriteBuffer, Value } =
	await import("../src/RuuviSensor.ts");

function createSettings(
	overrides: Partial<RuuviSensorSettings> = {}
): RuuviSensorSettings {
	return {
		url: "http://localhost:8080",
		api: {
			username: "user",
			password: "pass"
		},
		writeBuffer: {
			enabled: false,
			interval: 1000
		},
		...overrides
	};
}

beforeEach(() => {
	mockFetch.mockResolvedValue({});
});

afterEach(() => {
	vi.useRealTimers();
});

test("Reads settings and creates write buffer when enabled", () => {
	mockReadConfigFile.mockReturnValue(
		createSettings({ writeBuffer: { enabled: true, interval: 1000 } })
	);

	const sensor = new RuuviSensor("settings.json");

	expect(mockReadConfigFile).toHaveBeenCalledWith("settings.json");
	expect(sensor.getWriteBuffer()).toBeInstanceOf(WriteBuffer);
});

test("Does not create write buffer when disabled", () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");

	expect(sensor.getWriteBuffer()).toBe(null);
});

test("start() starts Ruuvi, registers listeners and starts write buffer", () => {
	mockReadConfigFile.mockReturnValue(
		createSettings({ writeBuffer: { enabled: true, interval: 1000 } })
	);

	const sensor = new RuuviSensor("settings.json");
	const writeBuffer = sensor.getWriteBuffer();

	if (writeBuffer === null) {
		throw new Error("Write buffer should not be null when enabled.");
	}

	const writeBufferStartSpy = vi.spyOn(writeBuffer, "start");

	sensor.start();

	expect(mockRuuviStart).toHaveBeenCalled();
	expect(mockRuuviOn).toHaveBeenCalledWith("found", expect.any(Function));
	expect(mockRuuviOn).toHaveBeenCalledWith("warning", expect.any(Function));
	expect(writeBufferStartSpy).toHaveBeenCalled();
});

test("start() does not fail when write buffer is disabled", () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");

	expect(() => {
		sensor.start();
	}).not.toThrow();
});

test("stop() stops Ruuvi and write buffer", () => {
	mockReadConfigFile.mockReturnValue(
		createSettings({ writeBuffer: { enabled: true, interval: 1000 } })
	);

	const sensor = new RuuviSensor("settings.json");
	const writeBuffer = sensor.getWriteBuffer();

	if (writeBuffer === null) {
		throw new Error("Write buffer should not be null when enabled.");
	}

	const writeBufferStopSpy = vi
		.spyOn(writeBuffer, "stop")
		.mockResolvedValue();

	sensor.stop();

	expect(mockRuuviStop).toHaveBeenCalled();
	expect(writeBufferStopSpy).toHaveBeenCalled();
});

test("stop() logs error when write buffer fails to write", async () => {
	mockReadConfigFile.mockReturnValue(
		createSettings({ writeBuffer: { enabled: true, interval: 1000 } })
	);

	const sensor = new RuuviSensor("settings.json");
	const writeBuffer = sensor.getWriteBuffer();

	if (writeBuffer === null) {
		throw new Error("Write buffer should not be null when enabled.");
	}

	vi.spyOn(writeBuffer, "stop").mockRejectedValue(new Error("failed"));

	sensor.stop();

	await vi.waitFor(() => {
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.any(Error),
			"Failed to write buffered values."
		);
	});
});

test("onRuuviTagFound() registers an updated listener on the tag", () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");
	const tagOn = vi.fn();
	const tag = { id: "tag-1", on: tagOn } as unknown as RuuviTag;
	const onTagUpdatedSpy = vi
		.spyOn(sensor, "onTagUpdated")
		.mockResolvedValue();

	sensor.onRuuviTagFound(tag);

	expect(tagOn).toHaveBeenCalledWith("updated", expect.any(Function));

	const updatedCallback = tagOn.mock.calls[0]?.[1] as (data: unknown) => void;
	const data = { dataFormat: 2 };
	updatedCallback(data);

	expect(onTagUpdatedSpy).toHaveBeenCalledWith("tag-1", data);
});

test("onRuuviWarning() logs a warning", () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");

	sensor.onRuuviWarning("something went wrong");

	expect(mockLogger.warn).toHaveBeenCalledWith("something went wrong");
});

test("onTagUpdated() skips messages without dataFormat", async () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");
	const writeSpy = vi.spyOn(sensor, "write").mockResolvedValue();

	await sensor.onTagUpdated("tag-1", {} as never);

	expect(writeSpy).not.toHaveBeenCalled();
});

test("onTagUpdated() warns and skips when no values are parsed", async () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");
	const writeSpy = vi.spyOn(sensor, "write").mockResolvedValue();

	await sensor.onTagUpdated("tag-1", { dataFormat: 99 } as never);

	expect(writeSpy).not.toHaveBeenCalled();
	expect(mockLogger.warn).toHaveBeenCalledWith(
		"No value attribute was recognized, skipping value."
	);
});

test("onTagUpdated() buffers values when write buffer is enabled", async () => {
	mockReadConfigFile.mockReturnValue(
		createSettings({ writeBuffer: { enabled: true, interval: 1000 } })
	);

	const sensor = new RuuviSensor("settings.json");
	const writeBuffer = sensor.getWriteBuffer();

	if (writeBuffer === null) {
		throw new Error("Write buffer should not be null when enabled.");
	}

	const bufferSpy = vi.spyOn(writeBuffer, "buffer");
	const writeSpy = vi.spyOn(sensor, "write").mockResolvedValue();

	const data: RuuviTagDataFormat2 = {
		dataFormat: 2,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325
	};

	await sensor.onTagUpdated("tag-1", data);

	expect(bufferSpy).toHaveBeenCalled();
	expect(writeSpy).not.toHaveBeenCalled();
});

test("onTagUpdated() writes directly when write buffer is disabled", async () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");
	const writeSpy = vi.spyOn(sensor, "write").mockResolvedValue();

	const data: RuuviTagDataFormat2 = {
		dataFormat: 2,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325
	};

	await sensor.onTagUpdated("tag-1", data);

	expect(writeSpy).toHaveBeenCalledOnce();
	expect(writeSpy.mock.calls[0]?.[0]).toHaveLength(3);
});

test("parseRuuviTagData() parses data format 2", () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	vi.useFakeTimers();
	vi.setSystemTime(1000);

	const sensor = new RuuviSensor("settings.json");
	const data: RuuviTagDataFormat2 = {
		dataFormat: 2,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325
	};

	const values = sensor.parseRuuviTagData("tag-1", data);

	expect(values).toEqual([
		new Value("tag-1", "temperature", 21.5, 1, 1000),
		new Value("tag-1", "humidity", 50.1, 1, 1000),
		new Value("tag-1", "pressure", 101.325, 3, 1000)
	]);
});

test("parseRuuviTagData() parses data format 3", () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	vi.useFakeTimers();
	vi.setSystemTime(1000);

	const sensor = new RuuviSensor("settings.json");
	const data: RuuviTagDataFormat3 = {
		dataFormat: 3,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325,
		accelerationX: 0,
		accelerationY: 0,
		accelerationZ: 0,
		battery: 2980
	};

	const values = sensor.parseRuuviTagData("tag-1", data);

	expect(values).toEqual([
		new Value("tag-1", "temperature", 21.5, 1, 1000),
		new Value("tag-1", "humidity", 50.1, 1, 1000),
		new Value("tag-1", "pressure", 101.325, 3, 1000),
		new Value("tag-1", "battery", 2.98, 2, 1000)
	]);
});

test("parseRuuviTagData() parses data format 4", () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	vi.useFakeTimers();
	vi.setSystemTime(1000);

	const sensor = new RuuviSensor("settings.json");
	const data = {
		dataFormat: 4,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325
	} satisfies RuuviTagDataFormat2;

	const values = sensor.parseRuuviTagData("tag-1", data);

	expect(values).toEqual([
		new Value("tag-1", "temperature", 21.5, 1, 1000),
		new Value("tag-1", "humidity", 50.1, 1, 1000),
		new Value("tag-1", "pressure", 101.325, 3, 1000)
	]);
});

test("parseRuuviTagData() parses data format 5 and skips null values", () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	vi.useFakeTimers();
	vi.setSystemTime(1000);

	const sensor = new RuuviSensor("settings.json");
	const data: RuuviTagDataFormat5 = {
		dataFormat: 5,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325,
		accelerationX: null,
		accelerationY: null,
		accelerationZ: null,
		battery: 2980,
		txPower: null,
		movementCounter: null,
		measurementSequenceNumber: null,
		mac: "aa:bb:cc:dd:ee:ff"
	};

	const values = sensor.parseRuuviTagData("tag-1", data);

	expect(values).toEqual([
		new Value("tag-1", "temperature", 21.5, 1, 1000),
		new Value("tag-1", "humidity", 50.1, 1, 1000),
		new Value("tag-1", "pressure", 101.325, 3, 1000),
		new Value("tag-1", "battery", 2.98, 2, 1000)
	]);
});

test("parseRuuviTagData() ignores null values for data format 5", () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	vi.useFakeTimers();
	vi.setSystemTime(1000);

	const sensor = new RuuviSensor("settings.json");
	const data: RuuviTagDataFormat5 = {
		dataFormat: 5,
		rssi: -60,
		humidity: null,
		temperature: null,
		pressure: null,
		accelerationX: null,
		accelerationY: null,
		accelerationZ: null,
		battery: null,
		txPower: null,
		movementCounter: null,
		measurementSequenceNumber: null,
		mac: "aa:bb:cc:dd:ee:ff"
	};

	const values = sensor.parseRuuviTagData("tag-1", data);

	expect(values).toEqual([]);
});

test("parseRuuviTagData() parses data format 6", () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	vi.useFakeTimers();
	vi.setSystemTime(1000);

	const sensor = new RuuviSensor("settings.json");
	const data: RuuviTagDataFormat6 = {
		dataFormat: 6,
		rssi: -60,
		humidity: 50.123,
		temperature: 21.456,
		pressure: 101325,
		pm25: 5.4,
		co2: 420.4,
		voc: 10.4,
		nox: 1.4,
		luminosity: null,
		measurementSequenceNumber: null,
		calibrationInProgress: false,
		mac: "aa:bb:cc:dd:ee:ff"
	};

	const values = sensor.parseRuuviTagData("tag-1", data);

	expect(values).toEqual([
		new Value("tag-1", "temperature", 21.5, 1, 1000),
		new Value("tag-1", "humidity", 50.1, 1, 1000),
		new Value("tag-1", "pressure", 101.325, 3, 1000),
		new Value("tag-1", "pm25", 5.4, 1, 1000),
		new Value("tag-1", "co2", 420, 0, 1000),
		new Value("tag-1", "voc", 10, 0, 1000),
		new Value("tag-1", "nox", 1, 0, 1000)
	]);
});

test("parseRuuviTagData() returns no values and warns for an unrecognized data format", () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");
	const values = sensor.parseRuuviTagData("tag-1", {
		dataFormat: 99
	} as never);

	expect(values).toEqual([]);
	expect(mockLogger.warn).toHaveBeenCalledWith(
		"Unrecognized data format 99. Skipping value."
	);
});

test("write() sends values to the remote host", async () => {
	mockReadConfigFile.mockReturnValue(createSettings());

	const sensor = new RuuviSensor("settings.json");
	const values = [new Value("tag-1", "temperature", 21.5, 1, 1000)];

	await sensor.write(values);

	expect(mockFetch).toHaveBeenCalledWith("http://localhost:8080/api/values", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`
		},
		body: JSON.stringify(values)
	});
});

test("write() logs an error when the request fails", async () => {
	mockReadConfigFile.mockReturnValue(createSettings());
	mockFetch.mockRejectedValue(new Error("network error"));

	const sensor = new RuuviSensor("settings.json");
	const values = [new Value("tag-1", "temperature", 21.5, 1, 1000)];

	await sensor.write(values);

	expect(mockLogger.error).toHaveBeenCalledWith(
		expect.any(Error),
		"Failed to send values to remote host."
	);
});

test("WriteBuffer.buffer() groups values by device and measurement", () => {
	const callback = vi.fn().mockResolvedValue(undefined);
	const writeBuffer = new WriteBuffer(1000, callback);

	writeBuffer.buffer([
		new Value("tag-1", "temperature", 20, 1, 1000),
		new Value("tag-1", "temperature", 22, 1, 2000),
		new Value("tag-1", "humidity", 50, 1, 1000)
	]);

	const cache = writeBuffer.getCache();

	expect(cache.get("tag-1-temperature")).toHaveLength(2);
	expect(cache.get("tag-1-humidity")).toHaveLength(1);
});

test("WriteBuffer.write() averages buffered values and clears the cache", async () => {
	const callback = vi.fn().mockResolvedValue(undefined);
	const writeBuffer = new WriteBuffer(1000, callback);

	writeBuffer.buffer([
		new Value("tag-1", "temperature", 20, 1, 1000),
		new Value("tag-1", "temperature", 22, 1, 3000)
	]);

	await writeBuffer.write();

	expect(callback).toHaveBeenCalledWith([
		new Value("tag-1", "temperature", 21, 1, 2000)
	]);
	expect(writeBuffer.getCache().size).toBe(0);
});

test("WriteBuffer.write() does not invoke the callback when there is nothing buffered", async () => {
	const callback = vi.fn().mockResolvedValue(undefined);
	const writeBuffer = new WriteBuffer(1000, callback);

	await writeBuffer.write();

	expect(callback).not.toHaveBeenCalled();
});

test("WriteBuffer.start() periodically flushes the buffer", () => {
	vi.useFakeTimers();

	const callback = vi.fn().mockResolvedValue(undefined);
	const writeBuffer = new WriteBuffer(1000, callback);
	const writeSpy = vi.spyOn(writeBuffer, "write");

	writeBuffer.buffer([new Value("tag-1", "temperature", 20, 1, 1000)]);
	writeBuffer.start();

	vi.advanceTimersByTime(1000);

	expect(writeSpy).toHaveBeenCalled();
});

test("WriteBuffer.stop() clears the interval and writes remaining values", async () => {
	vi.useFakeTimers();

	const callback = vi.fn().mockResolvedValue(undefined);
	const writeBuffer = new WriteBuffer(1000, callback);

	writeBuffer.buffer([new Value("tag-1", "temperature", 20, 1, 1000)]);
	writeBuffer.start();

	await writeBuffer.stop();

	expect(callback).toHaveBeenCalledOnce();

	vi.advanceTimersByTime(2000);

	expect(callback).toHaveBeenCalledOnce();
});

test("Value stores the given properties", () => {
	const value = new Value("tag-1", "temperature", 21.5, 1, 1000);

	expect(value.deviceId).toBe("tag-1");
	expect(value.measurementId).toBe("temperature");
	expect(value.value).toBe(21.5);
	expect(value.decimals).toBe(1);
	expect(value.time).toBe(1000);
});
