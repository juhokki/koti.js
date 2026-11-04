import { vi, expect, test, beforeEach } from "vitest";
import CronSchedule from "../../src/service/scheduler/schedules/CronSchedule.ts";
import SuncalcSchedule from "../../src/service/scheduler/schedules/SuncalcSchedule.ts";

vi.useFakeTimers();

beforeEach(() => {
	vi.setSystemTime(new Date("2026-06-21T12:00:00Z"));
});

test("CronSchedule runs on schedule and stops", async () => {
	const run = vi.fn();
	const schedule = new CronSchedule({ expression: "0 * * * *" });

	schedule.start(run);
	await vi.advanceTimersByTimeAsync(2 * 3600 * 1000);
	expect(run).toHaveBeenCalledTimes(2);

	await schedule.stop();
	await vi.advanceTimersByTimeAsync(2 * 3600 * 1000);
	expect(run).toHaveBeenCalledTimes(2);
});

test("CronSchedule stop before start does nothing", async () => {
	await expect(
		new CronSchedule({ expression: "0 * * * *" }).stop()
	).resolves.toBeUndefined();
});

test("SuncalcSchedule finds next time after now", () => {
	const schedule = new SuncalcSchedule({
		lat: 60.17,
		lng: 24.94,
		property: "sunrise"
	});
	const now = Date.now();
	const next = schedule.getNextTime(now);

	expect(next).toBeGreaterThan(now);
	expect(next).toBeLessThan(now + 24 * 3600 * 1000);
});

test("SuncalcSchedule returns undefined without an event", () => {
	const schedule = new SuncalcSchedule({
		lat: 80,
		lng: 0,
		property: "sunset"
	});

	expect(schedule.getNextTime(Date.now())).toBeUndefined();
});
