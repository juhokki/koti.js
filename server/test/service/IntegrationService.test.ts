import { expect, test, vi } from "vitest";
import DeviceType from "../../src/constants/DeviceType.ts";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";
import type IntegrationBase from "../../src/service/integration/IntegrationBase.js";
import type IntegrationConfig from "../../src/service/integration/IntegrationConfig.js";
import IntegrationService from "../../src/service/integration/IntegrationService.js";
import type IntegrationServiceSettings from "../../src/service/integration/IntegrationServiceSettings.js";
import RestApiIntegration from "../../src/service/integration/rest/RestApiIntegration.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";

const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockGetMeasurement = vi.hoisted(() => vi.fn());
const mockGetDevice = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
	readFileSync: mockReadFileSync
}));

const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getMeasurement: mockGetMeasurement,
				getDevice: mockGetDevice
			}
		] as unknown as AssetService,
		[
			"DataService",
			{
				on: () => {
					/* Do nothing */
				}
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const settings = {
	file: "./integrations.json"
} satisfies IntegrationServiceSettings;

test("IntegrationService is created", () => {
	mockReadFileSync.mockReturnValueOnce(JSON.stringify([]));
	const service = new IntegrationService(new ServiceLocator(), settings);
	expect(service).not.toBe(null);
});

test("Creates each configured integration type", () => {
	const integrationNames = [
		"RestApiIntegration",
		"OpenWeatherIntegration",
		"ShellyIntegration",
		"ToshibaAcIntegration",
		"MatterIntegration"
	];
	mockReadFileSync.mockReturnValueOnce(
		JSON.stringify(
			integrationNames.map((name) => ({
				name,
				enabled: true,
				deviceId: "device-1",
				updateInterval: 1000,
				apiKey: "key",
				location: "location",
				username: "user",
				password: "password",
				sasToken: "token",
				energyConsumptionUpdateInterval: 1000,
				stateUpdateInterval: 1000,
				serverUrl: "http://localhost",
				websocketUrl: "ws://localhost"
			}))
		)
	);

	const service = new IntegrationService(services, settings);

	expect(service.getEnabledIntegrations()).toStrictEqual(integrationNames);
});

test("Rejects integrations without an implementation", () => {
	mockReadFileSync.mockReturnValueOnce(
		JSON.stringify([{ name: "UnknownIntegration", enabled: true }])
	);

	expect(() => new IntegrationService(services, settings)).toThrow(
		"Implementation for integration UnknownIntegration not found"
	);
});

test("Controllable value is sent to integration", async () => {
	const measurement = new Measurement(
		"device-1",
		"meas-1",
		"Test",
		MeasurementType.Number,
		"",
		"icon",
		true
	);
	const device = new Device(
		"device-1",
		"TestIntegration" as DeviceType,
		"Test",
		"icon",
		[measurement]
	);
	const value = new Value("device-1", "meas-1", 10, Date.now());

	mockReadFileSync.mockReturnValueOnce(JSON.stringify([]));

	const service = new IntegrationService(services, settings);

	mockGetMeasurement.mockReturnValue(measurement);
	mockGetDevice.mockReturnValue(device);

	service.integrations = new Map();

	const mockControl = vi.fn();

	service.integrations.set("TestIntegration", {
		control: mockControl
	} as unknown as IntegrationBase);

	await service.onValueControlled(device.id, measurement.id, value);

	expect(mockControl).toHaveBeenCalledWith(device.id, measurement.id, value);
});

test("Rejects control of a non-controllable measurement", async () => {
	const measurement = new Measurement(
		"device-1",
		"meas-1",
		"Test",
		MeasurementType.Number,
		"",
		"icon",
		false
	);
	mockReadFileSync.mockReturnValueOnce(JSON.stringify([]));
	mockGetMeasurement.mockReturnValueOnce(measurement);
	const service = new IntegrationService(services, settings);

	await expect(
		service.onValueControlled(
			"device-1",
			"meas-1",
			new Value("device-1", "meas-1", 10)
		)
	).rejects.toThrow("is not controllable");
	expect(mockGetDevice).not.toHaveBeenCalled();
});

test("Enabled integrations are loaded, started and stopped with the service", async () => {
	const integrations = [
		{
			name: "RestApiIntegration",
			enabled: true
		},
		{
			name: "OpenWeatherIntegration",
			enabled: false
		}
	] satisfies IntegrationConfig[];

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(integrations));

	const spyStart = vi.spyOn(RestApiIntegration.prototype, "start");
	const spyStop = vi.spyOn(RestApiIntegration.prototype, "stop");

	const service = new IntegrationService(services, settings);

	await service.start();

	expect(service.integrations.size).toBe(1);
	expect(spyStart).toHaveBeenCalledTimes(1);

	await service.stop();

	expect(spyStop).toHaveBeenCalledTimes(1);
});

test("Returns enabled integrations and their parameters", () => {
mockReadFileSync.mockReturnValueOnce(JSON.stringify([]));

const service = new IntegrationService(services, settings);

service.integrations = new Map();
service.integrations.set("TestIntegration", {
getParameters: () => [{ name: "Count", value: 1 }]
} as unknown as IntegrationBase);

expect(service.getEnabledIntegrations()).toStrictEqual([
"TestIntegration"
]);
expect(service.getIntegrationParameters("TestIntegration")).toStrictEqual([
{ name: "Count", value: 1 }
]);
expect(() => service.getIntegrationParameters("Nope")).toThrow();
});
