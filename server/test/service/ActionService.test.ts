import { expect, test, vi } from "vitest";
import ActionTrigger from "../../src/constants/ActionTrigger.ts";
import ActionConfig from "../../src/service/asset/ActionConfig.js";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import ActionService from "../../src/service/action/ActionService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type ActionServiceSettings from "../../src/service/action/ActionServiceSettings.js";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import DeviceType from "../../src/constants/DeviceType.ts";
import type DataService from "../../src/service/data/DataService.js";

const mockGetDevices = vi.fn();
const mockReadLatestValue = vi.fn();
const mockControl = vi.fn();

const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getDevices: mockGetDevices
			} as unknown as AssetService
		],
		[
			"DataService",
			{
				on: () => {
					/* Do nothing */
				},
				readLatestValue: mockReadLatestValue,
				control: mockControl
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const settings = {} satisfies ActionServiceSettings;

test("ActionService is created", () => {
	const service = new ActionService(services, settings);
	expect(service).not.toBe(null);
});

test("Parses actions on start", async () => {
	const service = new ActionService(services, settings);

	mockGetDevices.mockReturnValue([
		new Device("device-1", DeviceType.ShellyIntegration, "name", "icon", [
			new Measurement(
				"device-1",
				"id",
				"name",
				MeasurementType.String,
				"unit",
				"icon",
				false,
				undefined,
				undefined,
				[new ActionConfig("test", ActionTrigger.OnChange, "")]
			)
		])
	]);

	await service.start();

	expect(service.getActions().length).toBe(1);
	expect(service.getActions()[0]).toStrictEqual(
		expect.objectContaining({
			name: "test"
		})
	);

	await service.stop();
});

test("Executes script that gets and controls a value", async () => {
	const service = new ActionService(services, settings);

	mockGetDevices.mockReturnValue([
		new Device("device-1", DeviceType.ShellyIntegration, "name", "icon", [
			new Measurement(
				"device-1",
				"id",
				"name",
				MeasurementType.Number,
				"unit",
				"icon",
				false,
				undefined,
				undefined,
				[
					new ActionConfig(
						"test",
						ActionTrigger.OnChange,
						"const value = this.getValue('device-1', 'id'); this.controlValue('device-1', 'id', value + 1);"
					)
				]
			)
		])
	]);

	mockReadLatestValue.mockReturnValueOnce(
		new Value("device-1", "id", 10, Date.now())
	);

	await service.start();

	service.onValueUpdated(
		"device-1",
		"id",
		new Value("device-1", "id", 99999)
	);

	expect(mockControl).toHaveBeenCalledWith(
		expect.objectContaining({
			deviceId: "device-1",
			measurementId: "id",
			value: 11
		})
	);

	await service.stop();
});
