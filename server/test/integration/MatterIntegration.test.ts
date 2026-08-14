import { LevelControl, OnOff } from "@matter/main/clusters";
import type { EndpointInterface } from "@matter/protocol";
import { EndpointNumber } from "@matter/types";
import { NodeStates } from "@project-chip/matter.js/device";
import { beforeEach, describe, expect, test, vi } from "vitest";
import DeviceOnlineStatus from "../../src/constants/DeviceOnlineStatus.ts";
import DeviceType from "../../src/constants/DeviceType.ts";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";
import MatterIntegration, {
	MEASUREMENT_BRIGHTNESS,
	MEASUREMENT_POWER
} from "../../src/service/integration/matter/MatterIntegration.js";
import type MatterIntegrationSettings from "../../src/service/integration/matter/MatterIntegrationConfig.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";

const mockGetCommissionedNodes = vi.hoisted(() => vi.fn());
const mockGetDevices = vi.hoisted(() => vi.fn());
const mockGetDevice = vi.hoisted(() => vi.fn());
const mockGetDevicesWithType = vi.hoisted(() => vi.fn());
const mockSetDeviceOnlineStatus = vi.hoisted(() => vi.fn());
const mockSetDeviceMeasurementDisabledStatus = vi.hoisted(() => vi.fn());
const mockReadLatestValue = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());

vi.mock("@matter/main", () => ({
	Environment: {
		default: {
			get: () => ({
				open: () =>
					Promise.resolve({
						createContext: () => ({
							set: () => Promise.resolve()
						})
					})
			})
		}
	},
	Logger: {},
	StorageService: {}
}));

vi.mock("@matter/main/clusters", () => ({
	OnOff: {
		Complete: "OnOff"
	},
	LevelControl: {
		Complete: "LevelControl"
	}
}));

vi.mock("@project-chip/matter.js", () => ({
	CommissioningController: vi.fn().mockImplementation(() => ({
		start: () => Promise.resolve(),
		getCommissionedNodes: mockGetCommissionedNodes,
		connectNode: () =>
			Promise.resolve({
				getDevices: mockGetDevices,
				events: {
					stateChanged: {
						on: () => {
							/* Do nothing */
						}
					}
				}
			})
	}))
}));

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getDevice: mockGetDevice,
				getDevicesWithType: mockGetDevicesWithType,
				setDeviceOnlineStatus: mockSetDeviceOnlineStatus,
				setDeviceMeasurementDisabledStatus:
					mockSetDeviceMeasurementDisabledStatus
			} as unknown as AssetService
		],
		[
			"DataService",
			{
				readLatestValue: mockReadLatestValue,
				write: mockWrite
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const options = {
	name: "MatterIntegration",
	enabled: true,
	storageLocation: ".matter",
	controllerId: "1732304842286"
} satisfies MatterIntegrationSettings;

test("MatterIntegration is created", () => {
	const integration = new MatterIntegration(services, options);
	expect(integration).not.toBe(null);
});

test("Sets device state to false and connects to matter node and writes initial values on start", async () => {
	const integration = new MatterIntegration(services, options);
	const device = new Device(
		"1",
		DeviceType.MatterIntegration,
		"test",
		"icon"
	);
	const matterDevices = [
		{
			number: EndpointNumber(Number(device.id)),
			getClusterClient: vi
				.fn()
				.mockImplementation(
					(clusterType: OnOff.Complete | LevelControl.Complete) => {
						switch (clusterType) {
							case OnOff.Complete:
								return {
									getOnOffAttribute: () => true,
									addOnOffAttributeListener: () => {
										/* Do nothing */
									}
								};
							case LevelControl.Complete:
								return {
									getCurrentLevelAttribute: () => 50,
									addCurrentLevelAttributeListener: () => {
										/* Do nothing */
									}
								};
						}
					}
				)
		}
	];

	mockGetDevice.mockReturnValueOnce(device);
	mockGetDevicesWithType.mockReturnValueOnce([device]);
	mockGetCommissionedNodes.mockReturnValueOnce([device.id]);
	mockGetDevices.mockReturnValueOnce(matterDevices);

	await integration.start();

	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.OFFLINE
	);
	expect(mockWrite).toHaveBeenCalledTimes(1);
});

test("Node state changes online status and restores previous state on connected", async () => {
	const integration = new MatterIntegration(services, options);
	const device = new Device(
		"1",
		DeviceType.MatterIntegration,
		"test",
		"icon"
	);
	const mockOn = vi.hoisted(() => vi.fn());
	const mockMoveToLevel = vi.hoisted(() => vi.fn());
	const matterDevices = [
		{
			number: EndpointNumber(Number(device.id)),
			getClusterClient: vi
				.fn()
				.mockImplementation(
					(clusterType: OnOff.Complete | LevelControl.Complete) => {
						switch (clusterType) {
							case OnOff.Complete:
								return {
									getOnOffAttribute: () => false,
									on: mockOn
								};
							case LevelControl.Complete:
								return {
									getCurrentLevelAttribute: () => 40,
									moveToLevel: mockMoveToLevel
								};
						}
					}
				)
		}
	] as unknown as EndpointInterface[];

	await integration.onNodeStateChanged(
		NodeStates.Disconnected,
		matterDevices
	);
	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.OFFLINE
	);

	await integration.onNodeStateChanged(
		NodeStates.Reconnecting,
		matterDevices
	);
	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.OFFLINE
	);

	await integration.onNodeStateChanged(
		NodeStates.WaitingForDeviceDiscovery,
		matterDevices
	);
	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.OFFLINE
	);

	const measurement1 = new Measurement(
		device.id,
		MEASUREMENT_POWER,
		"name",
		MeasurementType.Boolean,
		"",
		""
	);
	const measurement2 = new Measurement(
		device.id,
		MEASUREMENT_BRIGHTNESS,
		"name",
		MeasurementType.Number,
		"",
		""
	);
	mockReadLatestValue.mockReturnValueOnce(
		new Value(device.id, measurement1.id, true, now)
	);
	mockReadLatestValue.mockReturnValueOnce(
		new Value(device.id, measurement2.id, 50, now)
	);

	await integration.onNodeStateChanged(NodeStates.Connected, matterDevices);
	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.ONLINE
	);
	expect(mockSetDeviceOnlineStatus).toHaveBeenCalledTimes(4);

	expect(mockOn).toHaveBeenCalled();
	expect(mockMoveToLevel).toHaveBeenCalledWith(
		expect.objectContaining({
			level: 50
		})
	);
});

describe("Control device", () => {
	const device = new Device(
		"1",
		DeviceType.MatterIntegration,
		"test",
		"icon"
	);
	const measurement_power = new Measurement(
		device.id,
		MEASUREMENT_POWER,
		"name",
		MeasurementType.Boolean,
		"",
		""
	);
	const measurement_bri = new Measurement(
		device.id,
		MEASUREMENT_BRIGHTNESS,
		"name",
		MeasurementType.Number,
		"",
		""
	);
	const integration = new MatterIntegration(services, options);
	const mockOn = vi.fn();
	const mockOff = vi.fn();
	const mockMoveToLevel = vi.fn();

	beforeEach(() => {
		integration.matterDevices = [
			{
				number: EndpointNumber(Number(device.id)),
				getClusterClient: vi
					.fn()
					.mockImplementation(
						(
							clusterType: OnOff.Complete | LevelControl.Complete
						) => {
							switch (clusterType) {
								case OnOff.Complete:
									return {
										on: mockOn,
										off: mockOff
									};
								case LevelControl.Complete:
									return {
										moveToLevel: mockMoveToLevel
									};
							}
						}
					)
			}
		] as unknown as EndpointInterface[];
	});

	test("Sets power on", async () => {
		await integration.control(
			device.id,
			measurement_power.id,
			new Value(device.id, measurement_power.id, true, now)
		);
		expect(mockOn).toHaveBeenCalled();
	});

	test("Sets power off", async () => {
		await integration.control(
			device.id,
			measurement_power.id,
			new Value(device.id, measurement_power.id, false, now)
		);
		expect(mockOff).toHaveBeenCalled();
	});

	test("Sets level", async () => {
		await integration.control(
			device.id,
			measurement_bri.id,
			new Value(device.id, measurement_bri.id, 40, now)
		);
		expect(mockMoveToLevel).toHaveBeenCalledWith(
			expect.objectContaining({
				level: 40
			})
		);
	});
});
