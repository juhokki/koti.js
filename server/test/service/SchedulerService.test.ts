import { vi, expect, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Measurement from "../../src/model/Measurement.js";
import ScheduleConfig from "../../src/service/asset/ScheduleConfig.js";
import SchedulerService from "../../src/service/scheduler/SchedulerService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type DataService from "../../src/service/data/DataService.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type SchedulerServiceSettings from "../../src/service/scheduler/SchedulerServiceSettings.js";
import MeasurementType from "../../src/constants/MeasurementType.ts";

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const mockControl = vi.hoisted(() => vi.fn());

const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getMeasurements: () => [
					new Measurement(
						"device-1",
						"1",
						"meas",
						MeasurementType.Boolean,
						"unit",
						"icon",
						false,
						undefined,
						undefined,
						[],
						[],
						[new ScheduleConfig("Schedule 1", "0 1 * * *", true)]
					)
				]
			} as unknown as AssetService
		],
		[
			"DataService",
			{
				control: mockControl
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const settings = {} satisfies SchedulerServiceSettings;

test("SchedulerService is created", () => {
	const service = new SchedulerService(services, settings);
	expect(service).not.toBe(null);
});

test("Schedule is called", async () => {
	const service = new SchedulerService(services, settings);

	await service.start();

	await vi.advanceTimersByTimeAsync(86400001);

	expect(mockControl).toHaveBeenCalledWith(
		expect.objectContaining({
			deviceId: "device-1",
			measurementId: "1",
			value: true
		})
	);

	await service.stop();
});
