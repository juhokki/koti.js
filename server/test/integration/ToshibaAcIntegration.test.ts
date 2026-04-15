import { expect, vi, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Device from "../../src/model/Device.js";
import ToshibaAcIntegration from "../../src/service/integration/toshiba/ToshibaAcIntegration.js";
import type ToshibaAcIntegrationSettings from "../../src/service/integration/toshiba/ToshibaAcIntegrationConfig.js";
import type DataService from "../../src/service/data/DataService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import DeviceType from "../../src/enums/DeviceType.js";

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock("node-fetch", () => {
	return {
		default: mockFetch
	};
});

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const mockWrite = vi.hoisted(() => vi.fn());
const services = new ServiceLocator(
	new Map([
		[
			"DataService",
			{
				write: mockWrite
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const options = {
	enabled: true,
	name: "ToshibaAcIntegration",
	username: "test",
	password: "password",
	deviceId: "device-1",
	sasToken: "test-token",
	energyConsumptionUpdateInterval: 600000,
	stateUpdateInterval: 1800000
} satisfies ToshibaAcIntegrationSettings;

test("ToshibaAcIntegration is created", () => {
	const integration = new ToshibaAcIntegration(services, options);

	expect(integration).not.toBe(null);
});

test("ToshibaAcIntegration updates device state on start", async () => {
	const integration = new ToshibaAcIntegration(services, options);
	const device = new Device("1", DeviceType.ToshibaAcIntegration, "", "");

	mockFetch.mockReturnValueOnce(
		Promise.resolve({
			json: () =>
				Promise.resolve({
					IsSuccess: true,
					ResObj: "token"
				})
		})
	);

	mockFetch.mockReturnValueOnce(
		Promise.resolve({
			json: () =>
				Promise.resolve({
					IsSuccess: true,
					ResObj: [
						{
							ACList: [
								{
									Id: device.id
								}
							]
						}
					]
				})
		})
	);

	mockFetch.mockReturnValueOnce(
		Promise.resolve({
			json: () =>
				Promise.resolve({
					IsSuccess: true,
					ResObj: {
						ACStateData: "0000000000000000000000000000000" // TODO: Check with real data
					}
				})
		})
	);

	await integration.start();

	expect(mockWrite).toHaveBeenLastCalledWith(
		expect.arrayContaining([
			expect.objectContaining({
				deviceId: device.id,
				measurementId: "power",
				value: 0
			})
		])
	);
});
