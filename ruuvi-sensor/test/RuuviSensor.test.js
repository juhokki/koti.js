import { expect, jest, test } from "@jest/globals";

const mockFetch = jest.fn();
jest.unstable_mockModule("node-fetch", () => {
	return {
		"default": mockFetch
	};
});

const mockRuuviOn = jest.fn();
jest.unstable_mockModule("node-ruuvitag", () => {
	return {
		"default": {
			"on": mockRuuviOn
		}
	};
});

jest.useFakeTimers();

const { RuuviSensor, Value } = await import("../src/RuuviSensor.js");

test("RuuviSensor is created", () => {
	const settings = { "writeBuffer": { "enabled": true, "interval": 60000 }};
	const sensor = new RuuviSensor({ settings });
	
	expect(sensor).not.toBe(null);
});

test("RuuviSensor is started and tags can be discovered", async () => {
	const tagId = "tag-1";
	const values = { 
		"temperature": 1,
		"humidity": 2,
		"pressure": 3,
		"battery": 4
	};
	const settings = { "writeBuffer": { "enabled": true, "interval": 60000 }};
	const sensor = new RuuviSensor({ settings });

	mockRuuviOn.mockImplementationOnce((topic, callback) => {
		if (topic === "found") {
			callback({ 
				"id": tagId,
				"on": (topic, dataCallback) => {
					dataCallback(values);
				}
			});
		}
	});

	const spy = jest.spyOn(sensor, "onTagUpdated").mockReturnValue(Promise.resolve());

	await sensor.start();

	expect(spy).toHaveBeenCalledWith(tagId, values);
});

test("RuuviSensor writes values", () => {
	const now = Date.now();
	jest.setSystemTime(now);

	const settings = { 
		"url": "http://testurl",
		"api": {
			"username": "test",
			"password": "password"
		},
		"writeBuffer": { 
			"enabled": false
		}
	};
	const sensor = new RuuviSensor({ settings });
	const tagId = "test-1";
	const data = {
		"temperature": 20,
		"humidity": 50,
		"pressure": 1000,
		"battery": 3000
	};

	const username = settings.api.username;
	const password = settings.api.password;
	const basic = Buffer.from(`${username}:${password}`).toString("base64");
	const values = [
		new Value(tagId, "temperature", Number((data.temperature).toFixed(1)), 1, now),
		new Value(tagId, "humidity", Number((data.humidity).toFixed(1)), 1, now),
		new Value(tagId, "pressure", Number((data.pressure * 0.001).toFixed(3)), 3, now),
		new Value(tagId,  "battery", Number((data.battery * 0.001).toFixed(2)), 2, now)
	];

	sensor.onTagUpdated(tagId, data);

	expect(mockFetch).toHaveBeenCalledTimes(1);
	expect(mockFetch).toHaveBeenLastCalledWith(
		`${settings.url}/api/values`, 
		{
			"method": "POST",
			"headers": {
				"Content-Type": "application/json",
				"Authorization": `Basic ${basic}`
			},
			"body": JSON.stringify(values)
		}
	);
});

test("RuuviSensor buffers values", async () => {
	const now = Date.now();
	jest.setSystemTime(now);

	const settings = {
		"url": "http://testurl",
		"api": {
			"username": "test",
			"password": "password"
		},
		"writeBuffer": { 
			"enabled": true,
			"interval": 60000
		}
	};
	const sensor = new RuuviSensor({ settings });

	await sensor.start();
	
	const tagId = "test-1";
	const data = {
		"temperature": 20,
		"humidity": 50,
		"pressure": 1000,
		"battery": 3000
	};

	const username = settings.api.username;
	const password = settings.api.password;
	const basic = Buffer.from(`${username}:${password}`).toString("base64");

	await sensor.onTagUpdated(tagId, data);

	expect(mockFetch).toHaveBeenCalledTimes(0);
	expect(sensor.getWriteBuffer().getCache().size).toBe(4);

	jest.advanceTimersByTime(settings.writeBuffer.interval + 1);

	const values = [
		new Value(tagId, "temperature", Number((data.temperature).toFixed(1)), 1, now),
		new Value(tagId, "humidity", Number((data.humidity).toFixed(1)), 1, now),
		new Value(tagId, "pressure", Number((data.pressure * 0.001).toFixed(3)), 3, now),
		new Value(tagId, "battery", Number((data.battery * 0.001).toFixed(2)), 2, now)
	];

	expect(mockFetch).toHaveBeenCalledTimes(1);
	expect(mockFetch).toHaveBeenLastCalledWith(
		`${settings.url}/api/values`, 
		{
			"method": "POST",
			"headers": {
				"Content-Type": "application/json",
				"Authorization": `Basic ${basic}`
			},
			"body": JSON.stringify(values)
		}
	);
});

test("RuuviSensor buffer calculates average values", async () => {
	const now = Date.now();
	jest.setSystemTime(now);
	
	const settings = {
		"url": "http://testurl",
		"api": {
			"username": "test",
			"password": "password"
		},
		"writeBuffer": { 
			"enabled": true,
			"interval": 60000
		}
	};
	const sensor = new RuuviSensor({ settings });

	await sensor.start();
	
	const tagId = "test-1";
	const data = {
		"temperature": 20,
		"humidity": 50,
		"pressure": 1000,
		"battery": 3000
	};

	const username = settings.api.username;
	const password = settings.api.password;
	const basic = Buffer.from(`${username}:${password}`).toString("base64");

	sensor.onTagUpdated(tagId, data);

	const data2 = {
		"temperature": 20,
		"humidity": 60,
		"pressure": 1100,
		"battery": 3100
	};

	sensor.onTagUpdated(tagId, data2);

	expect(mockFetch).toHaveBeenCalledTimes(0);
	expect(sensor.getWriteBuffer().getCache().size).toBe(4);
	expect(sensor.getWriteBuffer().getCache().get(`${tagId}-temperature`).length).toBe(2);

	jest.advanceTimersByTime(settings.writeBuffer.interval + 1);

	const time2 = Math.round((now * 2) / 2);

	const values = [
		new Value(tagId, "temperature", Number(((data.temperature + data2.temperature) / 2).toFixed(1)), 1, time2),
		new Value(tagId, "humidity", Number(((data.humidity + data2.humidity) / 2).toFixed(1)), 1, time2),
		new Value(tagId, "pressure", Number((((data.pressure + data2.pressure) / 2) * 0.001).toFixed(3)), 3, time2),
		new Value(tagId, "battery", Number((((data.battery + data2.battery) / 2) * 0.001).toFixed(2)), 2, time2)
	];

	expect(mockFetch).toHaveBeenCalledTimes(1);
	expect(mockFetch).toHaveBeenLastCalledWith(
		`${settings.url}/api/values`, 
		{
			"method": "POST",
			"headers": {
				"Content-Type": "application/json",
				"Authorization": `Basic ${basic}`
			},
			"body": JSON.stringify(values)
		}
	);
});

test("Writebuffer is stopped and writes pending values", async () => {
	const now = Date.now();
	jest.setSystemTime(now);

	const settings = {
		"url": "http://testurl",
		"api": {
			"username": "test",
			"password": "password"
		},
		"writeBuffer": { 
			"enabled": true,
			"interval": 60000
		}
	};
	const sensor = new RuuviSensor({ settings });

	await sensor.start();
	
	const tagId = "test-1";
	const data = {
		"temperature": 20,
		"humidity": 50,
		"pressure": 1000,
		"battery": 3000
	};

	const username = settings.api.username;
	const password = settings.api.password;
	const basic = Buffer.from(`${username}:${password}`).toString("base64");

	sensor.onTagUpdated(tagId, data);

	expect(mockFetch).toHaveBeenCalledTimes(0);
	expect(sensor.getWriteBuffer().getCache().size).toBe(4);

	const values = [
		new Value(tagId, "temperature", Number((data.temperature).toFixed(1)), 1, now),
		new Value(tagId, "humidity", Number((data.humidity).toFixed(1)), 1, now),
		new Value(tagId, "pressure", Number((data.pressure * 0.001).toFixed(3)), 3, now),
		new Value(tagId, "battery", Number((data.battery * 0.001).toFixed(2)), 2, now)
	];

	await sensor.stop();

	expect(mockFetch).toHaveBeenCalledTimes(1);
	expect(mockFetch).toHaveBeenLastCalledWith(
		`${settings.url}/api/values`, 
		{
			"method": "POST",
			"headers": {
				"Content-Type": "application/json",
				"Authorization": `Basic ${basic}`
			},
			"body": JSON.stringify(values)
		}
	);
});