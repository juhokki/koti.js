import { expect, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import SystemService from "../../src/service/system/SystemService.js";
import type SystemServiceSettings from "../../src/service/system/SystemServiceSettings.js";

const services = new ServiceLocator();
const settings = {} satisfies SystemServiceSettings;

test("SystemService is created", () => {
	const service = new SystemService(services, settings);

	expect(service).not.toBe(null);
});

test("Can be started and stopped", async () => {
	const service = new SystemService(services, settings);

	await service.start();
	await service.stop();
});

test("Returns disk info", async () => {
	const service = new SystemService(services, settings);
	const disk = await service.getDisk();

	expect(disk).not.toBe(null);

	// TODO: Mock
	expect(disk.size > 0).toBe(true);
	expect(disk.free > 0).toBe(true);
});
