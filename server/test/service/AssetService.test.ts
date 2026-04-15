import { expect, test, vi } from "vitest";
import * as Messages from "../../src/constants/Messages.js";
import DeviceOnlineStatus from "../../src/enums/DeviceOnlineStatus.js";
import DeviceType from "../../src/enums/DeviceType.js";
import MeasurementType from "../../src/enums/MeasurementType.js";
import AssetService from "../../src/service/asset/AssetService.js";
import type AssetServiceSettings from "../../src/service/asset/AssetServiceSettings.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";

const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
	readFileSync: mockReadFileSync
}));

const services = new ServiceLocator();

const settings = {
	assetsFile: "./assets.json",
	devicesFile: "./devices.json"
} satisfies AssetServiceSettings;

test("AssetService is created", () => {
	mockReadFileSync.mockReturnValueOnce(JSON.stringify([]));
	mockReadFileSync.mockReturnValueOnce(JSON.stringify([]));

	const service = new AssetService(services, settings);

	expect(service).not.toBe(null);
});

test("Builds assets", async () => {
	const assetsConfig = [
		{
			id: "test-asset",
			name: "Test asset",
			icon: "test-icon",
			devices: ["test-device"]
		}
	];
	const devicesConfig = [
		{
			id: "test-device",
			name: "Test device",
			type: "test",
			icon: "test-icon",
			measurements: [
				{
					id: "test-meas",
					name: "Test",
					type: "number",
					unit: "unit",
					icon: "test-icon"
				}
			]
		}
	];

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(devicesConfig));
	mockReadFileSync.mockReturnValueOnce(JSON.stringify(assetsConfig));

	const service = new AssetService(services, settings);

	await service.start();

	const assets = service.getAssets();

	expect(assets).toStrictEqual([
		expect.objectContaining({
			id: "test-asset",
			name: "Test asset",
			icon: "test-icon",
			devices: [
				expect.objectContaining({
					id: "test-device",
					type: "test",
					name: "Test device",
					icon: "test-icon",
					measurements: [
						expect.objectContaining({
							id: "test-meas",
							deviceId: "test-device",
							name: "Test",
							type: "number",
							unit: "unit",
							icon: "test-icon"
						})
					]
				})
			]
		})
	]);
});

test("Finds asset, device and measurement", async () => {
	const assetsConfig = [
		{
			id: "test-asset",
			name: "Test asset",
			icon: "test-icon",
			devices: ["test-device"]
		}
	];
	const devicesConfig = [
		{
			id: "test-device",
			name: "Test device",
			type: DeviceType.ShellyIntegration,
			icon: "test-icon",
			measurements: [
				{
					id: "test-meas",
					name: "Test",
					type: MeasurementType.Number,
					unit: "unit",
					icon: "test-icon"
				}
			]
		}
	];

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(devicesConfig));
	mockReadFileSync.mockReturnValueOnce(JSON.stringify(assetsConfig));

	const service = new AssetService(services, settings);

	await service.start();

	expect(service.getAsset("test-asset").id).toBe("test-asset");
	expect(service.getDevices().length).toBe(1);
	expect(
		service.getDevicesWithType(DeviceType.ShellyIntegration).length
	).toBe(1);
	expect(service.getDevice("test-device").id).toBe("test-device");
	expect(service.getDeviceAsset("test-device").id).toBe("test-asset");
	expect(service.getDeviceMeasurements("test-device")).toStrictEqual([
		expect.objectContaining({ id: "test-meas" })
	]);
	expect(service.getMeasurements().length).toBe(1);
	expect(service.getMeasurement("test-device", "test-meas").id).toBe(
		"test-meas"
	);
});

test("Enables and disables device measurement", async () => {
	const assetsConfig = [
		{
			id: "test-asset",
			name: "Test asset",
			icon: "test-icon",
			devices: ["test-device"]
		}
	];
	const devicesConfig = [
		{
			id: "test-device",
			name: "Test device",
			type: "test",
			icon: "test-icon",
			measurements: [
				{
					id: "test-meas",
					name: "Test",
					type: "number",
					unit: "unit",
					icon: "test-icon"
				}
			]
		}
	];

	const mockEmit = vi.fn();

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(devicesConfig));
	mockReadFileSync.mockReturnValueOnce(JSON.stringify(assetsConfig));

	const service = new AssetService(services, settings);

	service.on(Messages.MEASUREMENT_UPDATED, mockEmit);

	await service.start();

	const measurement = service.getMeasurement("test-device", "test-meas");

	expect(measurement.getDisabled()).toBe(false);

	service.setDeviceMeasurementDisabledStatus(
		"test-device",
		"test-meas",
		true
	);

	expect(measurement.getDisabled()).toBe(true);
	expect(mockEmit).toHaveBeenLastCalledWith("test-device", "test-meas");

	service.setDeviceMeasurementDisabledStatus(
		"test-device",
		"test-meas",
		false
	);

	expect(measurement.getDisabled()).toBe(false);
	expect(mockEmit).toHaveBeenLastCalledWith("test-device", "test-meas");

	expect(mockEmit).toHaveBeenCalledTimes(2);
});

test("Enables and disables device online status", async () => {
	const assetsConfig = [
		{
			id: "test-asset",
			name: "Test asset",
			icon: "test-icon",
			devices: ["test-device"]
		}
	];
	const devicesConfig = [
		{
			id: "test-device",
			name: "Test device",
			type: "test",
			icon: "test-icon",
			measurements: [
				{
					id: "test-meas",
					name: "Test",
					type: "number",
					unit: "unit",
					icon: "test-icon"
				}
			]
		}
	];

	const mockEmit = vi.fn();

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(devicesConfig));
	mockReadFileSync.mockReturnValueOnce(JSON.stringify(assetsConfig));

	const service = new AssetService(services, settings);

	service.on(Messages.DEVICE_UPDATED, mockEmit);

	await service.start();

	const device = service.getDevice("test-device");

	expect(device.getOnlineStatus()).toBe(DeviceOnlineStatus.UNKNOWN);

	service.setDeviceOnlineStatus("test-device", DeviceOnlineStatus.ONLINE);

	expect(device.getOnlineStatus()).toBe(DeviceOnlineStatus.ONLINE);
	expect(mockEmit).toHaveBeenLastCalledWith("test-device");

	service.setDeviceOnlineStatus("test-device", DeviceOnlineStatus.OFFLINE);

	expect(device.getOnlineStatus()).toBe(DeviceOnlineStatus.OFFLINE);
	expect(mockEmit).toHaveBeenLastCalledWith("test-device");

	expect(mockEmit).toHaveBeenCalledTimes(2);
});
