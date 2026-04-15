import { vi, expect, test } from "vitest";
import Value from "../../src/model/Value.js";
import InfluxDatabase from "../../src/service/data/database/influx/InfluxDatabase.js";

const mockQuery = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());
const mockInfluxDb = vi.hoisted(() => vi.fn());

vi.mock("influx", async () => {
	const influx = await vi.importActual("influx");

	return {
		...influx,
		default: {
			escape: {
				stringLit: vi.fn()
			}
		},
		InfluxDB: mockInfluxDb.mockImplementation(() => ({
			query: mockQuery,
			writePoints: mockWrite
		}))
	};
});

const date = new Date();
vi.useFakeTimers();
vi.setSystemTime(date.getTime());

const settings = {
	type: "influxdb",
	host: "localhost",
	database: "test"
};

test("InfluxDatabase is created", () => {
	const database = new InfluxDatabase(settings);

	expect(database).not.toBe(null);
});

test("InfluxDatabase is started and stopped", async () => {
	const database = new InfluxDatabase(settings);

	await database.start();

	expect(mockInfluxDb).toHaveBeenCalled();

	await database.stop();
});

test("Latest values can be read", async () => {
	const result = [
		{
			time: date,
			device_id: "device-1",
			measurement_id: "meas-1",
			value_number: 10,
			value_boolean: null,
			value_string: null
		},
		{
			time: date,
			device_id: "device-1",
			measurement_id: "meas-2",
			value_number: null,
			value_boolean: true,
			value_string: null
		},
		{
			time: date,
			device_id: "device-1",
			measurement_id: "meas-3",
			value_number: null,
			value_boolean: null,
			value_string: "test"
		}
	];
	const database = new InfluxDatabase(settings);

	await database.start();

	mockQuery.mockReturnValueOnce(Promise.resolve(result));

	const values = (await database.readLatestValues()) as [Value, Value, Value];

	expect(values).toHaveLength(3);
	expect(values[0].deviceId).toBe("device-1");
	expect(values[0].measurementId).toBe("meas-1");
	expect(values[0].value).toBe(10);
	expect(values[0].time).toBe(date.getTime());
	expect(values[1].deviceId).toBe("device-1");
	expect(values[1].measurementId).toBe("meas-2");
	expect(values[1].value).toBe(true);
	expect(values[1].time).toBe(date.getTime());
	expect(values[2].deviceId).toBe("device-1");
	expect(values[2].measurementId).toBe("meas-3");
	expect(values[2].value).toBe("test");
	expect(values[2].time).toBe(date.getTime());
});

test("Value range can be read", async () => {
	const result = [
		{
			time: date,
			device_id: "device-1",
			measurement_id: "meas-1",
			value_number: 10,
			value_boolean: null,
			value_string: null
		},
		{
			time: date,
			device_id: "device-1",
			measurement_id: "meas-2",
			value_number: null,
			value_boolean: true,
			value_string: null
		},
		{
			time: date,
			device_id: "device-1",
			measurement_id: "meas-3",
			value_number: null,
			value_boolean: null,
			value_string: "test"
		}
	];
	const database = new InfluxDatabase(settings);

	await database.start();

	mockQuery.mockReturnValueOnce(Promise.resolve(result));

	const values = (await database.readValueRange(
		"device-1",
		date.getTime() - 1000,
		date.getTime() + 1000
	)) as [Value, Value, Value];

	expect(values.length).toBe(3);
	expect(values[0].deviceId).toBe("device-1");
	expect(values[0].measurementId).toBe("meas-1");
	expect(values[0].value).toBe(10);
	expect(values[0].time).toBe(date.getTime());
	expect(values[1].deviceId).toBe("device-1");
	expect(values[1].measurementId).toBe("meas-2");
	expect(values[1].value).toBe(true);
	expect(values[1].time).toBe(date.getTime());
	expect(values[2].deviceId).toBe("device-1");
	expect(values[2].measurementId).toBe("meas-3");
	expect(values[2].value).toBe("test");
	expect(values[2].time).toBe(date.getTime());
});

test("Writes values", async () => {
	const values = [
		new Value("device-1", "meas-1", 10, date.getTime()),
		new Value("device-1", "meas-2", 11, date.getTime())
	];
	const database = new InfluxDatabase(settings);

	await database.start();
	await database.write(values);

	expect(mockWrite).toHaveBeenCalled();
});
