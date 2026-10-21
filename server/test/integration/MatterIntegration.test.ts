import type { MatterNode, NodesChangedDetail } from "@matter-server/ws-client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import DeviceOnlineStatus from "../../src/constants/DeviceOnlineStatus.ts";
import DeviceType from "../../src/constants/DeviceType.ts";
import MeasurementType from "../../src/constants/MeasurementType.ts";
import Device from "../../src/model/Device.js";
import Measurement from "../../src/model/Measurement.js";
import Value from "../../src/model/Value.js";
import type AssetService from "../../src/service/asset/AssetService.ts";
import type DataService from "../../src/service/data/DataService.ts";
import MatterIntegration from "../../src/service/integration/matter/MatterIntegration.js";
import type MatterIntegrationSettings from "../../src/service/integration/matter/MatterIntegrationConfig.ts";
import type ServiceBase from "../../src/service/ServiceBase.ts";
import ServiceLocator from "../../src/service/ServiceLocator.ts";

interface MockMatterClient {
	nodes: Record<string, MatterNode>;
	listeners: Map<string, ((...args: unknown[]) => void)[]>;
	addEventListener: ReturnType<typeof vi.fn>;
	startListening: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
	deviceCommand: ReturnType<typeof vi.fn>;
	readAttribute: ReturnType<typeof vi.fn>;
}

const clientMocks = vi.hoisted(() => {
	const clients: MockMatterClient[] = [];
	const MatterClient = vi.fn().mockImplementation(function () {
		const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
		const client = {
			nodes: {},
			listeners,
			addEventListener: vi.fn(
				(event: string, listener: (...args: unknown[]) => void) => {
					const eventListeners = listeners.get(event) ?? [];
					eventListeners.push(listener);
					listeners.set(event, eventListeners);
					return () => {
						listeners.set(
							event,
							eventListeners.filter((entry) => entry !== listener)
						);
					};
				}
			),
			startListening: vi.fn().mockResolvedValue(undefined),
			disconnect: vi.fn(),
			deviceCommand: vi.fn().mockResolvedValue(undefined),
			readAttribute: vi.fn().mockResolvedValue({})
		};
		clients.push(client);
		return client;
	});
	return { clients, MatterClient };
});

vi.mock("@matter-server/ws-client", () => ({
	MatterClient: clientMocks.MatterClient
}));
vi.mock("ws", () => ({ default: vi.fn() }));

const now = Date.now();
const MEASUREMENT_POWER = "1-6";
const MEASUREMENT_BRIGHTNESS = "1-8";
const makeNode = (
	nodeId: number | bigint,
	available: boolean,
	attributes: Record<string, unknown>
) => ({ node_id: nodeId, available, attributes }) as MatterNode;

const getClient = () => {
	const client = clientMocks.clients[0];
	if (!client) {
		throw new Error("MatterClient was not constructed.");
	}
	return client;
};

const createServices = (devices: Device[]) => {
	const setDeviceOnlineStatus = vi.fn();
	const setDeviceMeasurementDisabledStatus = vi.fn();
	const assetService = {
		getDevice: vi.fn((deviceId: string) => {
			const device = devices.find((entry) => entry.id === deviceId);
			if (!device) {
				throw new Error(`Device "${deviceId}" not found.`);
			}
			return device;
		}),
		getDevicesWithType: vi.fn(() =>
			devices.filter(
				(device) => device.type === DeviceType.MatterIntegration
			)
		),
		getDeviceMeasurements: vi.fn(
			(deviceId: string) =>
				devices.find((device) => device.id === deviceId)
					?.measurements ?? []
		),
		setDeviceOnlineStatus,
		setDeviceMeasurementDisabledStatus
	} as unknown as AssetService;
	const readLatestValue = vi.fn();
	const write = vi.fn().mockResolvedValue(undefined);
	const dataService = { readLatestValue, write } as unknown as DataService;
	const services = new ServiceLocator(
		new Map<string, ServiceBase>([
			["AssetService", assetService],
			["DataService", dataService]
		])
	);
	return {
		services,
		readLatestValue,
		write,
		setDeviceOnlineStatus,
		setDeviceMeasurementDisabledStatus
	};
};

const createDevice = (id: string, endpointId = 1) =>
	new Device(id, DeviceType.MatterIntegration, `Matter ${id}`, "icon", [
		new Measurement(
			id,
			`${String(endpointId)}-6`,
			"Power",
			MeasurementType.Boolean,
			"",
			"",
			true
		),
		new Measurement(
			id,
			`${String(endpointId)}-8`,
			"Brightness",
			MeasurementType.Number,
			"",
			"",
			true
		)
	]);

const settings = () =>
	({
		name: "MatterIntegration",
		enabled: true,
		serverUrl: "ws://localhost:5580/ws"
	}) satisfies MatterIntegrationSettings;

const emit = (client: MockMatterClient, event: string, ...args: unknown[]) => {
	for (const listener of client.listeners.get(event) ?? []) {
		listener(...args);
	}
};

beforeEach(() => {
	vi.clearAllMocks();
	clientMocks.clients.length = 0;
});

afterEach(() => {
	vi.useRealTimers();
});

test("connects and initializes values from node-ID devices", async () => {
	const device = createDevice("123");
	const {
		services,
		write,
		setDeviceOnlineStatus,
		setDeviceMeasurementDisabledStatus
	} = createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	client.nodes["123"] = makeNode(123, true, {
		"1/6/0": true,
		"1/8/0": 55,
		"2/6/0": false
	});

	await integration.start();

	expect(client.startListening.mock.calls).toHaveLength(1);
	expect(setDeviceOnlineStatus.mock.calls.at(-1)).toEqual([
		device.id,
		DeviceOnlineStatus.ONLINE
	]);
	expect(setDeviceMeasurementDisabledStatus).toHaveBeenCalledWith(
		device.id,
		MEASUREMENT_BRIGHTNESS,
		false
	);
	expect(write.mock.calls[0]?.[0]).toEqual([
		expect.objectContaining({
			deviceId: device.id,
			measurementId: MEASUREMENT_POWER,
			value: true
		}),
		expect.objectContaining({
			deviceId: device.id,
			measurementId: MEASUREMENT_BRIGHTNESS,
			value: 55
		})
	]);

	await integration.stop();
	expect(client.disconnect.mock.calls).toHaveLength(1);
});

test("parses large node IDs and endpoint IDs from the device ID", async () => {
	const nodeId = "18446744069414584320";
	const device = createDevice(nodeId, 3);
	device.measurements.push(
		new Measurement(
			device.id,
			"1-6",
			"Power endpoint 1",
			MeasurementType.Boolean,
			"",
			"",
			true
		),
		new Measurement(
			device.id,
			"1-8",
			"Brightness endpoint 1",
			MeasurementType.Number,
			"",
			"",
			true
		)
	);
	const { services, write } = createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	client.nodes[nodeId] = makeNode(BigInt(nodeId), true, {
		"1/6/0": false,
		"1/8/0": 12,
		"3/6/0": true,
		"3/8/0": 42
	});

	await integration.start();

	expect(write.mock.calls[0]?.[0]).toEqual([
		expect.objectContaining({
			deviceId: device.id,
			measurementId: "3-6",
			value: true
		}),
		expect.objectContaining({
			deviceId: device.id,
			measurementId: "3-8",
			value: 42
		}),
		expect.objectContaining({
			deviceId: device.id,
			measurementId: "1-6",
			value: false
		}),
		expect.objectContaining({
			deviceId: device.id,
			measurementId: "1-8",
			value: 12
		})
	]);
	await integration.control(
		device.id,
		"3-6",
		new Value(device.id, "3-6", false, now)
	);
	await integration.control(
		device.id,
		"1-8",
		new Value(device.id, "1-8", 25, now)
	);
	expect(client.deviceCommand.mock.calls[0]).toEqual([
		BigInt(nodeId),
		3,
		6,
		"off"
	]);
	expect(client.deviceCommand.mock.calls[1]).toEqual([
		BigInt(nodeId),
		1,
		8,
		"moveToLevel",
		expect.objectContaining({ level: 25 })
	]);

	await integration.stop();
});

test("ignores Matter devices with an invalid encoded ID", async () => {
	const device = createDevice("not-a-matter-id");
	const { services, write, setDeviceOnlineStatus } = createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	client.nodes["123"] = makeNode(123, true, { "1/6/0": true });

	await integration.start();

	expect(write.mock.calls).toHaveLength(0);
	expect(setDeviceOnlineStatus.mock.calls.at(-1)).toEqual([
		device.id,
		DeviceOnlineStatus.OFFLINE
	]);
	await integration.stop();
});

test("writes attribute changes and updates brightness availability", async () => {
	const device = createDevice("123");
	const { services, write, setDeviceMeasurementDisabledStatus } =
		createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	const node = makeNode(123, true, { "1/6/0": true, "1/8/0": 30 });
	client.nodes["123"] = node;

	await integration.start();
	write.mockClear();
	node.attributes["1/6/0"] = false;
	emit(client, "nodes_changed", {
		reason: "attribute_updated",
		nodeId: 123,
		attributeKey: "1/6/0"
	} satisfies NodesChangedDetail);
	await vi.waitFor(() => {
		expect(write.mock.calls).toHaveLength(1);
	});

	expect(setDeviceMeasurementDisabledStatus.mock.calls.at(-1)).toEqual([
		device.id,
		MEASUREMENT_BRIGHTNESS,
		true
	]);
	expect(write.mock.calls[0]?.[0]).toEqual([
		expect.objectContaining({
			measurementId: MEASUREMENT_POWER,
			value: false
		})
	]);

	await integration.stop();
});

test("marks unavailable devices offline and restores their stored state on recovery", async () => {
	const device = createDevice("123");
	const { services, readLatestValue, write, setDeviceOnlineStatus } =
		createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	const node = makeNode(123, false, { "1/6/0": false, "1/8/0": 5 });
	client.nodes["123"] = node;
	readLatestValue.mockImplementation(
		(_deviceId: string, measurementId: string) =>
			measurementId === MEASUREMENT_POWER
				? new Value(device.id, measurementId, true)
				: new Value(device.id, measurementId, 20)
	);
	client.readAttribute.mockResolvedValue({ "1/6/0": true, "1/8/0": 20 });

	await integration.start();
	expect(setDeviceOnlineStatus.mock.calls.at(-1)).toEqual([
		device.id,
		DeviceOnlineStatus.OFFLINE
	]);

	node.available = true;
	emit(client, "nodes_changed", {
		reason: "node_updated",
		nodeId: 123
	} satisfies NodesChangedDetail);
	await vi.waitFor(() => {
		expect(client.deviceCommand.mock.calls).toHaveLength(2);
	});

	expect(client.deviceCommand.mock.calls[0]).toEqual([123, 1, 6, "on"]);
	expect(client.deviceCommand.mock.calls[1]).toEqual([
		123,
		1,
		8,
		"moveToLevel",
		expect.objectContaining({ level: 20 })
	]);
	expect(setDeviceOnlineStatus.mock.calls.at(-1)).toEqual([
		device.id,
		DeviceOnlineStatus.ONLINE
	]);
	expect(write.mock.calls.at(-1)?.[0]).toEqual([
		expect.objectContaining({
			measurementId: MEASUREMENT_POWER,
			value: true
		}),
		expect.objectContaining({
			measurementId: MEASUREMENT_BRIGHTNESS,
			value: 20
		})
	]);

	await integration.stop();
});

test("marks mapped devices offline when the Matter node is removed", async () => {
	const device = createDevice("123");
	const { services, setDeviceOnlineStatus } = createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	client.nodes["123"] = makeNode(123, true, {});

	await integration.start();
	emit(client, "nodes_changed", {
		reason: "node_removed",
		nodeId: 123
	} satisfies NodesChangedDetail);

	expect(setDeviceOnlineStatus.mock.calls.at(-1)).toEqual([
		device.id,
		DeviceOnlineStatus.OFFLINE
	]);
	await integration.stop();
});

describe("device control", () => {
	let integration: MatterIntegration;
	let client: MockMatterClient;
	const device = createDevice("123");

	beforeEach(async () => {
		const { services } = createServices([device]);
		integration = new MatterIntegration(services, settings());
		client = getClient();
		client.nodes["123"] = makeNode(123, true, {});
		await integration.start();
	});

	test("sends OnOff and LevelControl commands", async () => {
		await integration.control(
			device.id,
			MEASUREMENT_POWER,
			new Value(device.id, MEASUREMENT_POWER, true, now)
		);
		await integration.control(
			device.id,
			MEASUREMENT_BRIGHTNESS,
			new Value(device.id, MEASUREMENT_BRIGHTNESS, 40, now)
		);

		expect(client.deviceCommand.mock.calls[0]).toEqual([123, 1, 6, "on"]);
		expect(client.deviceCommand.mock.calls[1]).toEqual([
			123,
			1,
			8,
			"moveToLevel",
			expect.objectContaining({ level: 40 })
		]);
		await integration.stop();
	});

	test("rejects unmapped or unsupported controls", async () => {
		await expect(
			integration.control(
				"missing",
				MEASUREMENT_POWER,
				new Value("missing", MEASUREMENT_POWER, true)
			)
		).rejects.toThrow("not commissioned");
		await expect(
			integration.control(
				device.id,
				"other",
				new Value(device.id, "other", true)
			)
		).rejects.toThrow("Unrecognized Matter measurement");
		await integration.stop();
	});
});

test("reconnects after connection loss and cancels pending retries on stop", async () => {
	vi.useFakeTimers();
	const device = createDevice("123");
	const { services, setDeviceOnlineStatus } = createServices([device]);
	const integration = new MatterIntegration(services, settings());
	const client = getClient();
	client.nodes["123"] = makeNode(123, true, {});

	await integration.start();
	emit(client, "server_shutdown");
	expect(setDeviceOnlineStatus.mock.calls.at(-1)).toEqual([
		device.id,
		DeviceOnlineStatus.OFFLINE
	]);
	await vi.advanceTimersByTimeAsync(1_000);
	expect(client.startListening.mock.calls).toHaveLength(2);

	emit(client, "connection_lost");
	await integration.stop();
	await vi.advanceTimersByTimeAsync(5_000);
	expect(client.startListening.mock.calls).toHaveLength(2);
});
