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

const services = new ServiceLocator(
	new Map([
		["UserService", {} as unknown as UserService],
		["AlarmService", {} as unknown as AlarmService],
		[
			"DataService",
			{
				control: mockControl
			} as unknown as DataService
		],
		[
			"SystemService",
			{
				getDisk: mockGetDisk
			} as unknown as SystemService
		],
		[
			"IntegrationService",
			{
				get: () => ({
					write: mockWrite
				})
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

	// eslint-disable-next-line
	const response = await (request(app) as TestAgent).get("/system");

	expect(response.status).toBe(200);
	expect(response.body).toStrictEqual(
		expect.objectContaining({
			disk: {
				size: disk.getSize(),
				free: disk.getFree()
			}
		})
	);
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
