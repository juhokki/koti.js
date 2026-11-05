import { vi, expect, test, beforeEach } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Measurement from "../../src/model/Measurement.js";
import Schedule from "../../src/model/Schedule.js";
import SchedulerService from "../../src/service/scheduler/SchedulerService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type DataService from "../../src/service/data/DataService.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type SchedulerServiceSettings from "../../src/service/scheduler/SchedulerServiceSettings.js";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import ScheduleType from "../../src/constants/ScheduleType.ts";

const now = Date.now();
vi.useFakeTimers();

const mockControl = vi.hoisted(() => vi.fn());

beforeEach(() => {
	vi.setSystemTime(now);
	mockControl.mockClear();
});

function createServices(schedules: Schedule[]) {
	return new ServiceLocator(
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
							schedules
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
}

const services = createServices([
	new Schedule(
		"Schedule 1",
		ScheduleType.Cron,
		{ expression: "0 1 * * *" },
		true
	)
]);

const helsinki = { lat: 60.17, lng: 24.94 };

const settings = {} satisfies SchedulerServiceSettings;

test("SchedulerService is created", () => {
	const service = new SchedulerService(services, settings);
	expect(service).not.toBe(null);
});

test("Suncalc schedule is called at sunset and rescheduled", async () => {
	vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));
	const service = new SchedulerService(
		createServices([
			new Schedule(
				"Sunset",
				ScheduleType.Suncalc,
				{ ...helsinki, property: "sunset" },
				false
			)
		]),
		settings
	);

	await service.start();

	await vi.advanceTimersByTimeAsync(3 * 3600 * 1000);
	expect(mockControl).not.toHaveBeenCalled();

	await vi.advanceTimersByTimeAsync(6 * 3600 * 1000);
	expect(mockControl).toHaveBeenCalledTimes(1);
	expect(mockControl).toHaveBeenCalledWith(
		expect.objectContaining({
			deviceId: "device-1",
			measurementId: "1",
			value: false
		})
	);

	await vi.advanceTimersByTimeAsync(24 * 3600 * 1000);
	expect(mockControl).toHaveBeenCalledTimes(2);

	await service.stop();
	await vi.advanceTimersByTimeAsync(48 * 3600 * 1000);
	expect(mockControl).toHaveBeenCalledTimes(2);
});

test("Suncalc schedule without an event is retried the next day", async () => {
	vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));
	const service = new SchedulerService(
		createServices([
			new Schedule(
				"Polar sunset",
				ScheduleType.Suncalc,
				{ lat: 80, lng: 0, property: "sunset" },
				true
			)
		]),
		settings
	);

	await service.start();
	await vi.advanceTimersByTimeAsync(72 * 3600 * 1000);

	expect(service.tasks).toHaveLength(1);
	expect(mockControl).not.toHaveBeenCalled();

	await service.stop();
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
