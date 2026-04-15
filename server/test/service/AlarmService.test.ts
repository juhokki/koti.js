import { beforeEach, describe, expect, test, vi } from "vitest";
import * as Messages from "../../src/constants/Messages.js";
import AlarmType from "../../src/enums/AlarmType.js";
import DeviceType from "../../src/enums/DeviceType.js";
import MeasurementType from "../../src/enums/MeasurementType.js";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import AlarmService from "../../src/service/alarm/AlarmService.js";
import type AlarmServiceSettings from "../../src/service/alarm/AlarmServiceSettings.js";
import type StaleValueAlarmChecker from "../../src/service/alarm/alarmcheckers/StaleValueAlarmChecker.js";
import ValueUpperLimitAlarmChecker from "../../src/service/alarm/alarmcheckers/ValueUpperLimitAlarmChecker.js";
import AlarmConfig from "../../src/service/asset/AlarmConfig.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";

const mockGetDevice = vi.fn();
const mockGetMeasurements = vi.fn();
const mockGetMeasurement = vi.fn();
const mockGetDeviceAsset = vi.fn();
const mockReadLatestValue = vi.fn();

const services = new ServiceLocator(
	new Map([
		[
			"AssetService",
			{
				getDevice: mockGetDevice,
				getMeasurements: mockGetMeasurements,
				getMeasurement: mockGetMeasurement,
				getDeviceAsset: mockGetDeviceAsset
			} as unknown as AssetService
		],
		[
			"DataService",
			{
				on: (topic: string, callback: () => void) => {
					/* Do nothing */
				},
				readLatestValue: mockReadLatestValue
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const settings = {} satisfies AlarmServiceSettings;

describe("AlarmService", () => {
	const now = Date.now();

	vi.useFakeTimers();
	vi.spyOn(global, "setTimeout");

	beforeEach(() => {
		vi.setSystemTime(now);
	});

	test("AlarmService is created", () => {
		const service = new AlarmService(services, settings);
		expect(service).not.toBe(null);
	});

	describe("Alarm checkers", () => {
		test("Triggers two alarms for one measurement", async () => {
			const measurement = new Measurement(
				"device-1",
				"1",
				"meas",
				MeasurementType.Number,
				"",
				"",
				false,
				undefined,
				undefined,
				undefined,
				[
					new AlarmConfig("test", AlarmType.Stale, 86400000),
					new AlarmConfig("test", AlarmType.ValueUpperLimit, 10)
				]
			);
			const service = new AlarmService(services, settings);

			mockGetDevice.mockReturnValue(
				new Device(
					"device-1",
					DeviceType.ShellyIntegration,
					"name",
					"icon"
				)
			);
			mockGetMeasurements.mockReturnValue([measurement]);
			mockGetMeasurement.mockReturnValue(measurement);
			mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
			mockReadLatestValue.mockReturnValue(
				new Value("device-1", "1", 20, now - 86400000 - 1)
			);

			const mockAlarmsChange = vi.fn();
			service.on(Messages.ALARMS, mockAlarmsChange);

			await service.start();

			expect(mockAlarmsChange).toHaveBeenCalledTimes(2);
			expect(mockAlarmsChange).toHaveBeenLastCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						assetId: "asset-1",
						deviceId: "device-1",
						measurementId: "1",
						type: AlarmType.Stale
					}),
					expect.objectContaining({
						assetId: "asset-1",
						deviceId: "device-1",
						measurementId: "1",
						type: AlarmType.ValueUpperLimit
					})
				])
			);
		});

		test("Does not clear other alarm type", async () => {
			const measurement = new Measurement(
				"device-1",
				"1",
				"meas",
				MeasurementType.Number,
				"",
				"",
				false,
				undefined,
				undefined,
				[],
				[
					new AlarmConfig("test", AlarmType.Stale, 86400000),
					new AlarmConfig("test", AlarmType.ValueUpperLimit, 10)
				]
			);
			const service = new AlarmService(services, settings);

			mockGetDevice.mockReturnValue(
				new Device(
					"device-1",
					DeviceType.ShellyIntegration,
					"name",
					"icon"
				)
			);
			mockGetMeasurements.mockReturnValue([measurement]);
			mockGetMeasurement.mockReturnValue(measurement);
			mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
			mockReadLatestValue.mockReturnValue(
				new Value("device-1", "1", 20, now)
			);

			const mockAlarmsChange = vi.fn();
			service.on(Messages.ALARMS, mockAlarmsChange);

			await service.start();

			expect(mockAlarmsChange).toHaveBeenCalledTimes(1);
			expect(service.getAlarms().length).toBe(1);
			expect(mockAlarmsChange).toHaveBeenLastCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						assetId: "asset-1",
						deviceId: "device-1",
						measurementId: "1",
						type: AlarmType.ValueUpperLimit
					})
				])
			);

			service
				.getAlarmChecker<ValueUpperLimitAlarmChecker>(
					AlarmType.ValueUpperLimit
				)
				.onValueUpdated(
					"device-1",
					"1",
					new Value("device-1", "1", 30, now + 1000)
				);

			expect(mockAlarmsChange).toHaveBeenCalledTimes(1);
			expect(service.getAlarms().length).toBe(1);
		});

		test("Does not clear other alarm of same type", async () => {
			const service = new AlarmService(services, settings);

			mockGetDevice.mockImplementation((deviceId: string) => {
				if (deviceId === "device-1") {
					return new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					);
				} else if (deviceId === "device-2") {
					return new Device(
						"device-2",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					);
				}
			});

			mockGetMeasurements.mockReturnValue([
				new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					[],
					[new AlarmConfig("test", AlarmType.ValueUpperLimit, 30)]
				),
				new Measurement(
					"device-2",
					"2",
					"meas2",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					[],
					[new AlarmConfig("test", AlarmType.ValueUpperLimit, 30)]
				)
			]);

			mockGetMeasurement.mockImplementation((deviceId, measurementId) => {
				if (measurementId === "1") {
					return new Measurement(
						"device-1",
						"1",
						"meas",
						MeasurementType.Number,
						"",
						"",
						false,
						undefined,
						undefined,
						[],
						[new AlarmConfig("test", AlarmType.ValueUpperLimit, 30)]
					);
				} else if (measurementId === "2") {
					return new Measurement(
						"device-2",
						"2",
						"meas2",
						MeasurementType.Number,
						"",
						"",
						false,
						undefined,
						undefined,
						[],
						[new AlarmConfig("test", AlarmType.ValueUpperLimit, 30)]
					);
				}
			});

			mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });

			mockReadLatestValue.mockImplementation(
				(deviceId, measurementId) => {
					if (measurementId === "1") {
						return new Value("device-1", "1", 25, now);
					} else if (measurementId === "2") {
						return new Value("device-2", "2", 35, now);
					}
				}
			);

			const mockAlarmsChange = vi.fn();
			service.on(Messages.ALARMS, mockAlarmsChange);

			await service.start();

			expect(service.getAlarms().length).toBe(1);
			expect(mockAlarmsChange).toHaveBeenCalledTimes(1);
			expect(mockAlarmsChange).toHaveBeenLastCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						assetId: "asset-1",
						deviceId: "device-2",
						measurementId: "2",
						name: "test"
					})
				])
			);

			service
				.getAlarmChecker<ValueUpperLimitAlarmChecker>(
					AlarmType.ValueUpperLimit
				)
				.onValueUpdated(
					"device-1",
					"1",
					new Value("device-1", "1", 26, now + 1000)
				);

			expect(mockAlarmsChange).toHaveBeenCalledTimes(1);
			expect(service.getAlarms().length).toBe(1);
		});

		describe("Stale alarm checker", () => {
			test("Stale alarm is triggered when value is too old", async () => {
				const service = new AlarmService(services, settings);

				mockGetDevice.mockImplementation((deviceId: string) => {
					if (deviceId === "device-1") {
						return new Device(
							"device-1",
							DeviceType.ShellyIntegration,
							"name",
							"icon"
						);
					} else if (deviceId === "device-2") {
						return new Device(
							"device-2",
							DeviceType.ShellyIntegration,
							"name",
							"icon"
						);
					}
				});

				mockGetMeasurements.mockReturnValue([
					new Measurement(
						"device-1",
						"1",
						"meas",
						MeasurementType.Number,
						"",
						"",
						false,
						undefined,
						undefined,
						[],
						[new AlarmConfig("test", AlarmType.Stale, 86400000)]
					)
				]);

				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });

				mockReadLatestValue.mockImplementation(
					(deviceId, measurementId) => {
						return new Value(
							"device-1",
							"1",
							1,
							now - 86400000 - 1
						);
					}
				);

				const mockAlarmsChange = vi.fn();
				service.on(Messages.ALARMS, mockAlarmsChange);

				await service.start();

				expect(mockAlarmsChange).toHaveBeenCalledTimes(1);
				expect(mockAlarmsChange).toHaveBeenLastCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							assetId: "asset-1",
							deviceId: "device-1",
							measurementId: "1"
						})
					])
				);
			});

			test("Stale value checker queues alarm check", async () => {
				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);

				mockGetMeasurements.mockReturnValue([
					new Measurement(
						"device-1",
						"1",
						"meas",
						MeasurementType.Number,
						"",
						"",
						false,
						undefined,
						undefined,
						[],
						[new AlarmConfig("test", AlarmType.Stale, 86400000)]
					)
				]);

				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });

				mockReadLatestValue.mockImplementation(
					(deviceId, measurementId) => {
						return new Value("device-1", "1", 1, now - 1000);
					}
				);

				await service.start();

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(1);
				expect(setTimeout).toHaveBeenCalledTimes(1);
				expect(setTimeout).toHaveBeenLastCalledWith(
					expect.any(Function),
					86400000 - 1000
				);
			});

			test("Stale alarm is triggered when timer is expired", async () => {
				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);

				mockGetMeasurements.mockReturnValue([
					new Measurement(
						"device-1",
						"1",
						"meas",
						MeasurementType.Number,
						"",
						"",
						false,
						undefined,
						undefined,
						[],
						[new AlarmConfig("test", AlarmType.Stale, 86400000)]
					)
				]);

				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });

				mockReadLatestValue.mockImplementation(
					(deviceId, measurementId) => {
						return new Value("device-1", "1", 1, now - 1000);
					}
				);

				await service.start();

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(1);
				expect(setTimeout).toHaveBeenCalledTimes(1);
				expect(setTimeout).toHaveBeenLastCalledWith(
					expect.any(Function),
					86400000 - 1000
				);

				vi.advanceTimersByTime(86400000); // 1 day

				expect(service.getAlarms().length).toBe(1);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(0);
			});

			test("Stale value update resets timer", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					[],
					[new AlarmConfig("test", AlarmType.Stale, 86400000)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", 1, now - 20000)
				);

				await service.start();

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(1);
				expect(setTimeout).toHaveBeenCalledTimes(1);

				service
					.getAlarmChecker<StaleValueAlarmChecker>(AlarmType.Stale)
					.onValueUpdated(
						"device-1",
						"1",
						new Value("device-1", "1", 2, now - 10000)
					);

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(1);

				expect(setTimeout).toHaveBeenCalledTimes(2);
				expect(setTimeout).toHaveBeenNthCalledWith(
					1,
					expect.any(Function),
					86400000 - 20000
				);
				expect(setTimeout).toHaveBeenNthCalledWith(
					2,
					expect.any(Function),
					86400000 - 10000
				);
			});

			test("Stale value update clears alarm", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					[],
					[new AlarmConfig("test", AlarmType.Stale, 86400000)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", 1, now - 86400000 - 1)
				);

				await service.start();

				expect(service.getAlarms().length).toBe(1);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(0);

				service
					.getAlarmChecker<StaleValueAlarmChecker>(AlarmType.Stale)
					.onValueUpdated(
						"device-1",
						"1",
						new Value("device-1", "1", 2, now)
					);

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(1);
			});

			test("Stale checker timeouts are cleared on stop", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					[],
					[new AlarmConfig("test", AlarmType.Stale, 86400000)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", 1, now - 20000)
				);

				await service.start();

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(1);

				await service.stop();

				expect(service.getAlarms().length).toBe(0);
				expect(
					service
						.getAlarmChecker<StaleValueAlarmChecker>(
							AlarmType.Stale
						)
						.getTimeouts().length
				).toBe(0);
			});
		});

		describe("Upper value limit checker", () => {
			test("Value upper limit check", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					undefined,
					[new AlarmConfig("test", AlarmType.ValueUpperLimit, 50)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", 60, now)
				);

				await service.start();

				expect(service.getAlarms().length).toBe(1);

				expect(service.getAlarms()).toStrictEqual([
					expect.objectContaining({
						assetId: "asset-1",
						deviceId: "device-1",
						measurementId: "1",
						name: "test",
						time: now,
						type: AlarmType.ValueUpperLimit
					})
				]);

				await service.stop();
			});

			test("Value upper limit alarm is cleared on value change", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					undefined,
					[new AlarmConfig("test", AlarmType.ValueUpperLimit, 50)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", 60, now)
				);

				await service.start();

				expect(service.getAlarms().length).toBe(1);

				service
					.getAlarmChecker<ValueUpperLimitAlarmChecker>(
						AlarmType.ValueUpperLimit
					)
					.onValueUpdated(
						"device-1",
						"1",
						new Value("device-1", "1", 40, now)
					);

				expect(service.getAlarms().length).toBe(0);

				await service.stop();
			});

			test("Value upper limit alarm is not re-triggered on value change", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					undefined,
					[new AlarmConfig("test", AlarmType.ValueUpperLimit, 50)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", 60, now)
				);

				const mockAlarmsChange = vi.fn();
				service.on(Messages.ALARMS, mockAlarmsChange);

				await service.start();

				expect(service.getAlarms().length).toBe(1);
				expect(service.getAlarms()).toStrictEqual([
					expect.objectContaining({ time: now })
				]);
				expect(mockAlarmsChange).toHaveBeenCalledTimes(1);

				service
					.getAlarmChecker<ValueUpperLimitAlarmChecker>(
						AlarmType.ValueUpperLimit
					)
					.onValueUpdated(
						"device-1",
						"1",
						new Value("device-1", "1", 70, now + 1000)
					);

				expect(service.getAlarms().length).toBe(1);
				expect(service.getAlarms()).toStrictEqual([
					expect.objectContaining({ time: now })
				]);
				expect(mockAlarmsChange).toHaveBeenCalledTimes(1);

				await service.stop();
			});
		});

		describe("Lower value limit checker", () => {
			test("Value lower limit check", async () => {
				const measurement = new Measurement(
					"device-1",
					"1",
					"meas",
					MeasurementType.Number,
					"",
					"",
					false,
					undefined,
					undefined,
					undefined,
					[new AlarmConfig("test", AlarmType.ValueLowerLimit, 0)]
				);

				const service = new AlarmService(services, settings);

				mockGetDevice.mockReturnValue(
					new Device(
						"device-1",
						DeviceType.ShellyIntegration,
						"name",
						"icon"
					)
				);
				mockGetMeasurements.mockReturnValue([measurement]);
				mockGetMeasurement.mockReturnValue(measurement);
				mockGetDeviceAsset.mockReturnValue({ id: "asset-1" });
				mockReadLatestValue.mockReturnValue(
					new Value("device-1", "1", -10, now)
				);

				await service.start();

				expect(service.getAlarms()).toStrictEqual([
					expect.objectContaining({
						assetId: "asset-1",
						deviceId: "device-1",
						measurementId: "1",
						name: "test",
						time: now,
						type: AlarmType.ValueLowerLimit
					})
				]);

				await service.stop();
			});
		});
	});
});
