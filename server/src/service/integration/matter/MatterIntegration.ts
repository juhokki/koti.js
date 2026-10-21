import {
	MatterClient,
	type MatterNode,
	type NodesChangedDetail,
	type WebSocketLike
} from "@matter-server/ws-client";
import WebSocket from "ws";
import DeviceOnlineStatus from "../../../constants/DeviceOnlineStatus.ts";
import DeviceType from "../../../constants/DeviceType.ts";
import Value from "../../../model/Value.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import IntegrationBase from "../IntegrationBase.ts";
import type MatterIntegrationSettings from "./MatterIntegrationConfig.ts";
import logger from "../../../util/logger.ts";

const ON_OFF_CLUSTER_ID = 6;
const LEVEL_CONTROL_CLUSTER_ID = 8;
const RECONNECT_MAX_DELAY_MS = 30_000;

interface MatterDeviceAddress {
	deviceId: string;
	nodeId: string;
}

interface MatterMeasurementAddress {
	measurementId: string;
	endpointId: number;
	clusterId: number;
}

export default class MatterIntegration extends IntegrationBase {
	options: MatterIntegrationSettings;
	client: MatterClient;
	private stopped = true;
	private reconnectAttempts = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private nodeAvailability = new Map<string, boolean>();
	private matterDevices: MatterDeviceAddress[] = [];
	private unsubscribeNodesChanged: (() => void) | null = null;
	private unsubscribeConnectionLost: (() => void) | null = null;
	private unsubscribeServerShutdown: (() => void) | null = null;

	constructor(services: ServiceLocator, options: MatterIntegrationSettings) {
		super(services);

		this.options = options;
		this.client = new MatterClient(
			options.serverUrl,
			(url) => new WebSocket(url) as unknown as WebSocketLike
		);
	}

	override async start() {
		this.matterDevices = this.getConfiguredMatterDevices();
		this.stopped = false;
		this.markConfiguredDevicesOffline();
		this.unsubscribeNodesChanged = this.client.addEventListener(
			"nodes_changed",
			(detail) => {
				void this.handleNodesChanged(detail).catch((error: unknown) => {
					logger.error(error, "Failed to handle Matter node change.");
				});
			}
		);
		this.unsubscribeConnectionLost = this.client.addEventListener(
			"connection_lost",
			() => {
				this.handleConnectionLost();
			}
		);
		this.unsubscribeServerShutdown = this.client.addEventListener(
			"server_shutdown",
			() => {
				this.handleConnectionLost();
			}
		);

		await this.connectAndListen();
	}

	override stop(): Promise<void> {
		this.stopped = true;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.unsubscribeNodesChanged?.();
		this.unsubscribeNodesChanged = null;
		this.unsubscribeConnectionLost?.();
		this.unsubscribeConnectionLost = null;
		this.unsubscribeServerShutdown?.();
		this.unsubscribeServerShutdown = null;
		this.client.disconnect();
		this.nodeAvailability.clear();
		return Promise.resolve();
	}

	private async connectAndListen() {
		if (this.shouldStop()) {
			return;
		}

		try {
			await this.client.startListening();
			if (this.shouldStop()) {
				return;
			}
			this.reconnectAttempts = 0;
			for (const node of Object.values(this.client.nodes)) {
				await this.syncNode(node, true);
			}
		} catch (error) {
			logger.error(error, "Failed to connect to the Matter server.");
			this.scheduleReconnect();
		}
	}

	private handleConnectionLost() {
		this.nodeAvailability.clear();
		this.markConfiguredDevicesOffline();
		this.scheduleReconnect();
	}

	private shouldStop() {
		return this.stopped;
	}

	private scheduleReconnect() {
		if (this.stopped || this.reconnectTimer) {
			return;
		}

		const delay = Math.min(
			1_000 * 2 ** this.reconnectAttempts,
			RECONNECT_MAX_DELAY_MS
		);
		this.reconnectAttempts += 1;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			void this.connectAndListen();
		}, delay);
	}

	private async handleNodesChanged(detail: NodesChangedDetail) {
		const nodeKey = String(detail.nodeId);
		if (detail.reason === "node_removed") {
			this.nodeAvailability.set(nodeKey, false);
			this.setNodeDevicesOnlineStatus(
				nodeKey,
				DeviceOnlineStatus.OFFLINE
			);
			return;
		}

		const node = this.client.nodes[nodeKey];
		if (!node) {
			return;
		}

		if (detail.reason === "attribute_updated") {
			await this.handleAttributeUpdate(node, detail.attributeKey);
			return;
		}

		const wasAvailable = this.nodeAvailability.get(nodeKey);
		await this.syncNode(node, wasAvailable === undefined || !wasAvailable);
	}

	private async syncNode(node: MatterNode, restorePreviousState: boolean) {
		const nodeKey = String(node.node_id);
		const wasAvailable = this.nodeAvailability.get(nodeKey);
		this.nodeAvailability.set(nodeKey, node.available);
		this.setNodeDevicesOnlineStatus(
			nodeKey,
			node.available
				? DeviceOnlineStatus.ONLINE
				: DeviceOnlineStatus.OFFLINE
		);

		if (!node.available) {
			return;
		}

		for (const mapping of this.getNodeMappings(nodeKey)) {
			let attributes = node.attributes;
			if (restorePreviousState || wasAvailable === false) {
				try {
					attributes = await this.restorePreviousState(
						mapping.deviceId,
						mapping.nodeId,
						attributes
					);
				} catch (error) {
					logger.error(
						error,
						`Failed to restore previous state for device ${mapping.deviceId}.`
					);
				}
			}
			await this.writeCurrentValues(mapping.deviceId, attributes);
		}
	}

	private async restorePreviousState(
		deviceId: string,
		nodeId: string,
		attributes: MatterNode["attributes"]
	) {
		const nodeIdValue = this.toMatterNodeId(nodeId);
		const refreshedPaths: string[] = [];
		for (const measurement of this.getMeasurementAddresses(deviceId)) {
			const path = this.toAttributePath(measurement);
			const storedValue = this.services
				.getDataService()
				.readLatestValue(deviceId, measurement.measurementId);
			const currentValue = attributes[path];
			if (!storedValue || currentValue === storedValue.value) {
				continue;
			}

			if (
				measurement.clusterId === ON_OFF_CLUSTER_ID &&
				typeof storedValue.value === "boolean" &&
				typeof currentValue === "boolean"
			) {
				await this.client.deviceCommand(
					nodeIdValue,
					measurement.endpointId,
					ON_OFF_CLUSTER_ID,
					storedValue.value ? "on" : "off"
				);
				refreshedPaths.push(path);
			} else if (
				measurement.clusterId === LEVEL_CONTROL_CLUSTER_ID &&
				typeof storedValue.value === "number" &&
				typeof currentValue === "number"
			) {
				await this.client.deviceCommand(
					nodeIdValue,
					measurement.endpointId,
					LEVEL_CONTROL_CLUSTER_ID,
					"moveToLevel",
					{
						level: storedValue.value,
						transitionTime: null,
						optionsMask: {},
						optionsOverride: {}
					}
				);
				refreshedPaths.push(path);
			}
		}

		if (refreshedPaths.length === 0) {
			return attributes;
		}

		const refreshedAttributes = await this.client.readAttribute(
			nodeIdValue,
			refreshedPaths
		);
		return { ...attributes, ...refreshedAttributes };
	}

	private async writeCurrentValues(
		deviceId: string,
		attributes: MatterNode["attributes"]
	) {
		const values: Value[] = [];
		for (const measurement of this.getMeasurementAddresses(deviceId)) {
			const value = attributes[this.toAttributePath(measurement)];
			if (
				measurement.clusterId === ON_OFF_CLUSTER_ID &&
				typeof value === "boolean"
			) {
				values.push(
					new Value(deviceId, measurement.measurementId, value)
				);
				this.setBrightnessDisabled(
					deviceId,
					`${String(measurement.endpointId)}-${String(LEVEL_CONTROL_CLUSTER_ID)}`,
					!value
				);
			} else if (
				measurement.clusterId === LEVEL_CONTROL_CLUSTER_ID &&
				typeof value === "number"
			) {
				values.push(
					new Value(deviceId, measurement.measurementId, value)
				);
			}
		}

		await this.services.getDataService().write(values);
	}

	private async handleAttributeUpdate(
		node: MatterNode,
		attributeKey: string
	) {
		const [endpointPart, clusterPart, attributePart] =
			attributeKey.split("/");
		if (attributePart !== "0") {
			return;
		}

		const endpointId = Number(endpointPart);
		const clusterId = Number(clusterPart);
		const mapping = this.matterDevices.find(
			(candidate) => candidate.nodeId === String(node.node_id)
		);
		if (!mapping || !node.available) {
			return;
		}
		const measurementId = `${String(endpointId)}-${String(clusterId)}`;
		if (
			!this.getMeasurementAddresses(mapping.deviceId).some(
				(measurement) => measurement.measurementId === measurementId
			)
		) {
			return;
		}

		const value = node.attributes[attributeKey];
		if (clusterId === ON_OFF_CLUSTER_ID) {
			if (typeof value !== "boolean") {
				return;
			}
			this.setBrightnessDisabled(
				mapping.deviceId,
				`${String(endpointId)}-${String(LEVEL_CONTROL_CLUSTER_ID)}`,
				!value
			);
			await this.services
				.getDataService()
				.write([new Value(mapping.deviceId, measurementId, value)]);
		} else if (
			clusterId === LEVEL_CONTROL_CLUSTER_ID &&
			typeof value === "number"
		) {
			await this.services
				.getDataService()
				.write([new Value(mapping.deviceId, measurementId, value)]);
		}
	}

	private markConfiguredDevicesOffline() {
		for (const device of this.services
			.getAssetService()
			.getDevicesWithType(DeviceType.MatterIntegration)) {
			this.setDeviceOnlineStatus(device.id, DeviceOnlineStatus.OFFLINE);
		}
	}

	private setNodeDevicesOnlineStatus(
		nodeId: string,
		status: DeviceOnlineStatus
	) {
		for (const mapping of this.getNodeMappings(nodeId)) {
			this.setDeviceOnlineStatus(mapping.deviceId, status);
		}
	}

	private setDeviceOnlineStatus(
		deviceId: string,
		status: DeviceOnlineStatus
	) {
		try {
			this.services
				.getAssetService()
				.setDeviceOnlineStatus(deviceId, status);
		} catch (error) {
			logger.warn(error, `Matter device ${deviceId} is not configured.`);
		}
	}

	private setBrightnessDisabled(
		deviceId: string,
		measurementId: string,
		disabled: boolean
	) {
		try {
			this.services
				.getAssetService()
				.setDeviceMeasurementDisabledStatus(
					deviceId,
					measurementId,
					disabled
				);
		} catch (error) {
			logger.warn(
				error,
				`Brightness measurement for Matter device ${deviceId} is not configured.`
			);
		}
	}

	private getNodeMappings(nodeId: string) {
		return this.matterDevices.filter((device) => device.nodeId === nodeId);
	}

	private getConfiguredMatterDevices(): MatterDeviceAddress[] {
		return this.services
			.getAssetService()
			.getDevicesWithType(DeviceType.MatterIntegration)
			.flatMap((device) => {
				if (!/^\d+$/.test(device.id)) {
					logger.warn(
						`Ignoring Matter device with invalid node ID "${device.id}".`
					);
					return [];
				}
				const nodeId = BigInt(device.id).toString();

				return [
					{
						deviceId: device.id,
						nodeId
					}
				];
			});
	}

	private getMeasurementAddresses(
		deviceId: string
	): MatterMeasurementAddress[] {
		return this.services
			.getAssetService()
			.getDeviceMeasurements(deviceId)
			.flatMap((measurement) => {
				const match = /^(\d+)-(\d+)$/.exec(measurement.id);
				const endpointPart = match?.[1];
				const clusterPart = match?.[2];
				const endpointId = Number(endpointPart);
				const clusterId = Number(clusterPart);
				if (
					!endpointPart ||
					!clusterPart ||
					!Number.isSafeInteger(endpointId) ||
					endpointId > 65_534 ||
					!Number.isSafeInteger(clusterId) ||
					clusterId > 0xffff_ffff
				) {
					logger.warn(
						`Ignoring Matter measurement with invalid ID "${measurement.id}" for device "${deviceId}"; expected endpointId-clusterId.`
					);
					return [];
				}
				return [
					{ measurementId: measurement.id, endpointId, clusterId }
				];
			});
	}

	private toAttributePath(measurement: MatterMeasurementAddress) {
		return `${String(measurement.endpointId)}/${String(measurement.clusterId)}/0`;
	}

	private toMatterNodeId(nodeId: string): number | bigint {
		const value = BigInt(nodeId);
		return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
	}

	override async control(
		deviceId: string,
		measurementId: string,
		value: Value
	): Promise<void> {
		const mapping = this.matterDevices.find(
			(candidate) => candidate.deviceId === deviceId
		);
		if (!mapping) {
			throw new Error(`Matter device ${deviceId} not commissioned`);
		}

		const node = this.client.nodes[mapping.nodeId];
		if (!node?.available) {
			throw new Error(`Matter device ${deviceId} is not available`);
		}

		const nodeId = this.toMatterNodeId(mapping.nodeId);
		const measurement = this.getMeasurementAddresses(deviceId).find(
			(address) => address.measurementId === measurementId
		);
		if (!measurement) {
			throw new Error(`Unrecognized Matter measurement ${measurementId}`);
		}

		switch (measurement.clusterId) {
			case ON_OFF_CLUSTER_ID:
				if (typeof value.value !== "boolean") {
					throw new Error(
						`OnOff value must be boolean for ${measurementId}`
					);
				}
				await this.client.deviceCommand(
					nodeId,
					measurement.endpointId,
					ON_OFF_CLUSTER_ID,
					value.value ? "on" : "off"
				);
				return;
			case LEVEL_CONTROL_CLUSTER_ID:
				if (typeof value.value !== "number") {
					throw new Error(
						`LevelControl value must be numeric for ${measurementId}`
					);
				}
				await this.client.deviceCommand(
					nodeId,
					measurement.endpointId,
					LEVEL_CONTROL_CLUSTER_ID,
					"moveToLevel",
					{
						level: value.value,
						transitionTime: null,
						optionsMask: {},
						optionsOverride: {}
					}
				);
				return;
			default:
				throw new Error(
					`Unrecognized measurement type ${measurementId}`
				);
		}
	}
}
