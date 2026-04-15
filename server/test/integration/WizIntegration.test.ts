import { expect, vi, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import DeviceOnlineStatus from "../../src/enums/DeviceOnlineStatus.js";
import WizIntegration, {
	MEASUREMENT_POWER,
	MEASUREMENT_BRIGHTNESS,
	DEVICE_OFFLINE_LIMIT
} from "../../src/service/integration/wiz/WizIntegration.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";
import type WizIntegrationSettings from "../../src/service/integration/wiz/WizIntegrationSettings.js";
import DeviceType from "../../src/enums/DeviceType.js";
import MeasurementType from "../../src/enums/MeasurementType.js";
import { Bulb } from "wikari";

const mockOnDiscover = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn());
const mockOnSync = vi.hoisted(() => vi.fn());
const mockGetPilot = vi.hoisted(() => vi.fn());
const mockCloseConnection = vi.hoisted(() => vi.fn());
const mockBulbTurn = vi.hoisted(() => vi.fn());
const mockBulbBrightness = vi.hoisted(() => vi.fn());

vi.mock("node:dgram", () => ({
	default: {
		createSocket: vi.fn().mockImplementation(() => ({
			on: mockOnDiscover,
			once: () => {
				/* Do nothing */
			},
			off: () => {
				/* Do nothing */
			},
			send: () => {
				/* Do nothing */
			},
			close: () => {
				/* Do nothing */
			}
		}))
	}
}));

const MockBulb = vi.hoisted(() => {
	class MockBulbImpl {
		address: string;
		macIdentifier: string;
		subscribe: () => void;
		onSync: () => void;
		getPilot: () => void;
		closeConnection: () => void;
		turn: () => void;
		brightness: () => void;

		constructor(
			address: string,
			options: Record<"address" | "macIdentifier", string>
		) {
			this.address = address;
			this.macIdentifier = options.macIdentifier;
			this.subscribe = mockSubscribe;
			this.onSync = mockOnSync;
			this.getPilot = mockGetPilot;
			this.closeConnection = mockCloseConnection;
			this.turn = mockBulbTurn;
			this.brightness = mockBulbBrightness;
		}
	}

	return MockBulbImpl;
});

vi.mock("wikari", () => ({
	Bulb: MockBulb,
	WIZ_BULB_LISTEN_PORT: 38899,
	DEFAULT_DISCOVER_WAIT_MS: 2000
}));

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const mockGetDevicesWithType = vi.hoisted(() => vi.fn());
const mockSetDeviceOnlineStatus = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());

const services = new ServiceLocator(
	new Map([
		[
			"DataService",
			{
				write: mockWrite
			} as unknown as DataService
		],
		[
			"AssetService",
			{
				getDevicesWithType: mockGetDevicesWithType,
				setDeviceOnlineStatus: mockSetDeviceOnlineStatus
			} as unknown as AssetService
		]
	] as [string, ServiceBase][])
);

const options = {
	enabled: true,
	name: "WizIntegration",
	address: "10.10.2.255",
	interface: undefined,
	discoverInterval: 60000,
	heartbeatInterval: 30000
} satisfies WizIntegrationSettings;

test("WizIntegration is created", () => {
	const integration = new WizIntegration(services, options);
	expect(integration).not.toBe(null);
});

test("Discovers bulbs on start and writes initial values", async () => {
	const integration = new WizIntegration(services, options);
	const device = new Device(
		"d8a011539664",
		DeviceType.WizIntegration,
		"",
		""
	);

	integration.sleep = () => Promise.resolve();

	mockGetDevicesWithType.mockReturnValueOnce([device]);
	mockOnDiscover.mockImplementationOnce(
		(
			topic,
			callback: (msg: string, rinfo: Record<string, string>) => void
		) => {
			callback(
				JSON.stringify({
					env: "pro",
					result: {
						mac: device.id
					}
				}),
				{
					address: "10.10.2.2"
				}
			);
		}
	);
	mockGetPilot.mockReturnValueOnce(
		Promise.resolve({
			result: {
				mac: device.id,
				state: true,
				dimming: 50
			}
		})
	);

	await integration.start();

	expect(mockSetDeviceOnlineStatus).toHaveBeenCalledTimes(2);
	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.ONLINE
	);

	expect(mockWrite).toHaveBeenLastCalledWith(
		expect.arrayContaining([
			expect.objectContaining({
				deviceId: device.id,
				measurementId: MEASUREMENT_POWER,
				value: true
			}),
			expect.objectContaining({
				deviceId: device.id,
				measurementId: MEASUREMENT_BRIGHTNESS,
				value: 50
			})
		])
	);

	await integration.stop();

	expect(mockCloseConnection).toHaveBeenCalledTimes(1);
});

test("Sets bulbs with no new messages as offline", () => {
	const integration = new WizIntegration(services, options);
	const device = new Device(
		"d8a011539664",
		DeviceType.WizIntegration,
		"",
		""
	);

	integration.bulbs = [{ macIdentifier: device.id }] as Bulb[];

	integration.bulbLastHeartbeat.set(
		device.id,
		now - DEVICE_OFFLINE_LIMIT - 1
	);

	integration.checkHeartbeats();

	expect(mockSetDeviceOnlineStatus).toHaveBeenLastCalledWith(
		device.id,
		DeviceOnlineStatus.OFFLINE
	);
});

test("Bulb sync writes new values", async () => {
	const integration = new WizIntegration(services, options);
	const device = new Device(
		"d8a011539664",
		DeviceType.WizIntegration,
		"",
		""
	);

	integration.bulbLastValueUpdates.set(device.id, now - 1);

	await integration.onBulbSync({
		method: "",
		env: "pro",
		params: {
			rssi: 0,
			mac: device.id,
			ts: now,
			state: true,
			dimming: 50
		}
	});

	expect(integration.bulbLastValueUpdates.get(device.id)).toBe(now);

	expect(mockWrite).toHaveBeenLastCalledWith(
		expect.arrayContaining([
			expect.objectContaining({
				deviceId: device.id,
				measurementId: MEASUREMENT_POWER,
				value: true
			}),
			expect.objectContaining({
				deviceId: device.id,
				measurementId: MEASUREMENT_BRIGHTNESS,
				value: 50
			})
		])
	);
});

test("Controls bulb power", async () => {
	const integration = new WizIntegration(services, options);
	const device = new Device(
		"d8a011539664",
		DeviceType.WizIntegration,
		"",
		""
	);
	const measurement = new Measurement(
		device.id,
		MEASUREMENT_POWER,
		"name",
		MeasurementType.Boolean,
		"",
		""
	);

	integration.bulbs = [
		{
			macIdentifier: device.id,
			turn: mockBulbTurn
		}
	] as unknown as Bulb[];

	await integration.control(
		device.id,
		measurement.id,
		new Value(device.id, measurement.id, true, now)
	);

	expect(mockBulbTurn).toHaveBeenLastCalledWith(true);

	await integration.control(
		device.id,
		measurement.id,
		new Value(device.id, measurement.id, false, now)
	);

	expect(mockBulbTurn).toHaveBeenLastCalledWith(false);
});

test("Controls bulb brightness", async () => {
	const integration = new WizIntegration(services, options);
	const device = new Device(
		"d8a011539664",
		DeviceType.WizIntegration,
		"",
		""
	);
	const measurement = new Measurement(
		device.id,
		MEASUREMENT_BRIGHTNESS,
		"name",
		MeasurementType.Number,
		"",
		""
	);

	integration.bulbs = [
		{
			macIdentifier: device.id,
			brightness: mockBulbBrightness
		}
	] as unknown as Bulb[];

	await integration.control(
		device.id,
		measurement.id,
		new Value(device.id, measurement.id, 50, now)
	);

	expect(mockBulbBrightness).toHaveBeenLastCalledWith(50);
});

test("Sleep resolves after timeout", async () => {
	const integration = new WizIntegration(services, options);

	let called = false;

	const promise = integration.sleep(1000);
	promise
		.then(() => {
			called = true;
		})
		.catch((e: unknown) => {
			/* Do nothing */
		});

	vi.advanceTimersByTime(1001);

	await new Promise<void>((resolve) => {
		resolve();
	});

	expect(called).toBe(true);
});
