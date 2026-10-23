import bodyParser from "body-parser";
import express from "express";
import request from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { expect, test, vi } from "vitest";
import Disk from "../../src/model/Disk.js";
import Value from "../../src/model/Value.js";
import type AlarmService from "../../src/service/alarm/AlarmService.js";
import type DataService from "../../src/service/data/DataService.js";
import getApiRouter from "../../src/service/http/routes/api/index.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import type SystemService from "../../src/service/system/SystemService.js";
import type UserService from "../../src/service/user/UserService.js";

const mockGetDisk = vi.fn();
const mockWrite = vi.fn();
const mockControl = vi.fn();
const mockGetEnabledIntegrations = vi.fn();
const mockGetIntegrationParameters = vi.fn();
const mockReadDeviceValues = vi.fn();

const services = new ServiceLocator(
	new Map([
		["UserService", {} as unknown as UserService],
		["AlarmService", {} as unknown as AlarmService],
		["RecipeService", {}],
		[
			"DataService",
			{
				control: mockControl,
				readDeviceValues: mockReadDeviceValues
			} as unknown as DataService
		],
		[
			"SystemService",
			{
				getDisk: mockGetDisk,
				getUptime: () => 1
			} as unknown as SystemService
		],
		[
			"IntegrationService",
			{
				get: () => ({
					write: mockWrite
				}),
				getEnabledIntegrations: mockGetEnabledIntegrations,
				getIntegrationParameters: mockGetIntegrationParameters
			} as unknown as SystemService
		]
	] as [string, ServiceBase][])
);

test("Gets system info", async () => {
	const disk = new Disk(1000, 50);
	const app = express();

	app.use(bodyParser.json());
	app.use(getApiRouter(services));

	mockGetDisk.mockReturnValueOnce(Promise.resolve(disk));
	mockGetEnabledIntegrations.mockReturnValueOnce(["RestApiIntegration"]);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent).get("/system");

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual(
		expect.objectContaining({
			integrations: ["RestApiIntegration"],
			disk: {
				size: disk.getSize(),
				free: disk.getFree()
			}
		})
	);
});

test("Gets integration parameters", async () => {
	const app = express();

	app.use(getApiRouter(services));

	mockGetEnabledIntegrations.mockReturnValue(["RestApiIntegration"]);
	mockGetIntegrationParameters.mockReturnValueOnce([
		{ name: "Count", value: 1 }
	]);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent).get(
		"/system/integration?name=RestApiIntegration"
	);

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual({
		name: "RestApiIntegration",
		parameters: [{ name: "Count", value: 1 }]
	});
});

test("Integration info requires name and enabled integration", async () => {
	const app = express();

	app.use(getApiRouter(services));

	mockGetEnabledIntegrations.mockReturnValue(["RestApiIntegration"]);

	// eslint-disable-next-line
	const missing = await (request(app) as TestAgent).get("/system/integration");
	// eslint-disable-next-line
	const unknown = await (request(app) as TestAgent).get(
		"/system/integration?name=Nope"
	);

	expect(missing.status).toBe(400);
	expect(unknown.status).toBe(404);
});

test("Writes new value", async () => {
	const values = [
		new Value("device-1", "meas-1", 10, Date.now()),
		new Value("device-1", "meas-2", 11, Date.now())
	];
	const app = express();

	app.use(bodyParser.json());
	app.use(getApiRouter(services));

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/values")
		.send(values);

	expect(response.status).toBe(200);
	expect(mockWrite).toHaveBeenCalled();
	expect(mockWrite).toHaveBeenCalledWith(values);
});

test("Returns a device value range", async () => {
	const values = [new Value("device-1", "meas-1", 10, Date.now())];
	const app = express();

	app.use(getApiRouter(services));
	mockReadDeviceValues.mockResolvedValueOnce(values);

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent).get(
		"/values/device-1?startTime=100&endTime=200"
	);

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual(
		values.map(({ deviceId, measurementId, value, time }) => ({
			deviceId,
			measurementId,
			value,
			time
		}))
	);
	expect(mockReadDeviceValues).toHaveBeenCalledWith("device-1", 100, 200);
});

test("Returns an error when reading a device value range fails", async () => {
	const app = express();
	app.use(getApiRouter(services));
	mockReadDeviceValues.mockRejectedValueOnce(new Error("Database unavailable"));

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent).get(
		"/values/device-1?startTime=100&endTime=200"
	);

	expect(response.status).toBe(500);
	expect(response.text).toBe("Failed to read values.");
});

test("Returns an error when writing values fails", async () => {
	const app = express();
	app.use(bodyParser.json());
	app.use(getApiRouter(services));
	mockWrite.mockRejectedValueOnce(new Error("Integration unavailable"));

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.post("/values")
		.send([]);

	expect(response.status).toBe(500);
	expect(response.text).toBe("Failed to write values.");
});

test("Controls value", async () => {
	const value = new Value("device-1", "meas-1", 10, Date.now());
	const app = express();

	app.use(bodyParser.json());
	app.use(getApiRouter(services));

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.put("/values")
		.send(value);

	expect(response.status).toBe(200);
	expect(mockControl).toHaveBeenCalledWith(
		expect.objectContaining({
			deviceId: value.deviceId,
			measurementId: value.measurementId,
			value: value.value,
			time: value.time
		})
	);
});

test("Returns an error when controlling a value fails", async () => {
	const app = express();
	app.use(bodyParser.json());
	app.use(getApiRouter(services));
	mockControl.mockRejectedValueOnce(new Error("Device unavailable"));

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent)
		.put("/values")
		.send(new Value("device-1", "meas-1", 10, Date.now()));

	expect(response.status).toBe(500);
	expect(response.text).toBe("Failed to control value.");
});
