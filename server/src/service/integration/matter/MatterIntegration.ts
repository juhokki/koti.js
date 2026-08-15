import { Environment, Filesystem, Logger, StorageService } from "@matter/main";
import { LevelControl, OnOff } from "@matter/main/clusters";
import { NodeId } from "@matter/main/types";
import {
	CommissioningController,
	type CommissioningControllerOptions
} from "@project-chip/matter.js";
import { NodeStates, Endpoint } from "@project-chip/matter.js/device";
import { NodeJsFilesystem } from "@matter/nodejs";
import DeviceOnlineStatus from "../../../constants/DeviceOnlineStatus.ts";
import DeviceType from "../../../constants/DeviceType.ts";
import Value from "../../../model/Value.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import IntegrationBase from "../IntegrationBase.ts";
import type MatterIntegrationSettings from "./MatterIntegrationConfig.ts";
import logger from "../../../util/logger.ts";

export const MEASUREMENT_POWER = "power";
export const MEASUREMENT_BRIGHTNESS = "brightness";

export default class MatterIntegration extends IntegrationBase {
	options: MatterIntegrationSettings;
	matterDevices: Endpoint[];

	constructor(services: ServiceLocator, options: MatterIntegrationSettings) {
		super(services);

		this.options = options;
		this.matterDevices = [];
	}

	override async start() {
		const assetService = this.services.getAssetService();

		assetService
			.getDevicesWithType(DeviceType.MatterIntegration)
			.forEach((device) => {
				assetService.setDeviceOnlineStatus(
					device.id,
					DeviceOnlineStatus.OFFLINE
				);
			});

		Logger.level = 1; // INFO

		const environment = Environment.default;
		environment.set(
			Filesystem,
			new NodeJsFilesystem(() => this.options.storageLocation)
		);

		const storageService = environment.get(StorageService);

		const controllerStorage = (
			await storageService.open("controller")
		).createContext("data");

		await controllerStorage.set("uniqueid", this.options.controllerId);

		const commissioningOptions: CommissioningControllerOptions = {
			environment: {
				environment: environment,
				id: this.options.controllerId
			},
			autoConnect: false,
			adminFabricLabel: "Koti.js"
		};

		const commissioningController = new CommissioningController(
			commissioningOptions
		);

		await commissioningController.start();

		const nodes = commissioningController.getCommissionedNodes();

		for (const node of nodes) {
			await this.connectNode(commissioningController, node);
		}
	}

	async connectNode(
		commissioningController: CommissioningController,
		node: NodeId
	): Promise<void> {
		const nodeId = NodeId(node);
		const pairedNode = await commissioningController.getNode(nodeId);
		const devices = pairedNode.getDevices();

		pairedNode.events.stateChanged.on((info) => {
			this.onNodeStateChanged(info, devices).catch((e: unknown) => {
				logger.error(e, "Failed to handle node state change.");
			});
		});

		pairedNode.connect();

		for (const matterDevice of devices) {
			await this.getMatterDeviceValues(matterDevice);
		}
	}

	async getMatterDeviceValues(matterDevice: Endpoint) {
		const deviceIdString = String(matterDevice.number);

		try {
			this.services.getAssetService().getDevice(deviceIdString);
		} catch (e) {
			logger.warn(
				`Discovered Matter device with id ${deviceIdString} is not configured. Ignoring.`
			);
			return;
		}

		logger.info(`Discovered Matter device with id ${deviceIdString}.`);

		this.matterDevices.push(matterDevice);

		const values = [];
		const onOffClient = matterDevice.getClusterClient(OnOff);
		const levelControlClient = matterDevice.getClusterClient(LevelControl);

		if (onOffClient) {
			const onOffStatus = await onOffClient.getOnOffAttribute();
			values.push(
				new Value(
					deviceIdString,
					MEASUREMENT_POWER,
					onOffStatus,
					Date.now()
				)
			);

			this.services
				.getAssetService()
				.setDeviceMeasurementDisabledStatus(
					deviceIdString,
					MEASUREMENT_BRIGHTNESS,
					!onOffStatus
				);

			onOffClient.addOnOffAttributeListener((value) => {
				this.services
					.getDataService()
					.write([
						new Value(
							deviceIdString,
							MEASUREMENT_POWER,
							value,
							Date.now()
						)
					])
					.catch((e: unknown) => {
						logger.error(e, "Failed to write value");
					});

				this.services
					.getAssetService()
					.setDeviceMeasurementDisabledStatus(
						deviceIdString,
						MEASUREMENT_BRIGHTNESS,
						!value
					);
			});
		}

		if (levelControlClient) {
			const levelControlStatus =
				await levelControlClient.getCurrentLevelAttribute();

			if (levelControlStatus !== null) {
				values.push(
					new Value(
						deviceIdString,
						MEASUREMENT_BRIGHTNESS,
						levelControlStatus,
						Date.now()
					)
				);

				levelControlClient.addCurrentLevelAttributeListener((value) => {
					if (value !== null) {
						this.services
							.getDataService()
							.write([
								new Value(
									deviceIdString,
									MEASUREMENT_BRIGHTNESS,
									value,
									Date.now()
								)
							])
							.catch((e: unknown) => {
								logger.error(e, "Failed to write value");
							});
					}
				});
			}
		}

		await this.services.getDataService().write(values);
	}

	async onNodeStateChanged(info: NodeStates, devices: Endpoint[]) {
		switch (info) {
			case NodeStates.Connected:
				for (const matterDevice of devices) {
					const deviceIdString = String(matterDevice.number);
					this.services
						.getAssetService()
						.setDeviceOnlineStatus(
							deviceIdString,
							DeviceOnlineStatus.ONLINE
						);

					await this.updateDevicePreviousState(matterDevice).catch(
						(e: unknown) => {
							logger.error(
								e,
								`Failed to update previous state for device ${deviceIdString}.`
							);
						}
					);
				}
				break;
			case NodeStates.Disconnected:
			case NodeStates.Reconnecting:
			case NodeStates.WaitingForDeviceDiscovery:
				for (const matterDevice of devices) {
					const deviceIdString = String(matterDevice.number);
					this.services
						.getAssetService()
						.setDeviceOnlineStatus(
							deviceIdString,
							DeviceOnlineStatus.OFFLINE
						);
				}
				break;
		}
	}

	async updateDevicePreviousState(matterDevice: Endpoint) {
		const deviceIdString = String(matterDevice.number);
		const onOffClient = matterDevice.getClusterClient(OnOff);
		const levelControlClient = matterDevice.getClusterClient(LevelControl);

		if (onOffClient) {
			const power = this.services
				.getDataService()
				.readLatestValue(deviceIdString, MEASUREMENT_POWER);
			const onOffStatus = await onOffClient.getOnOffAttribute();

			if (power && onOffStatus !== power.value) {
				await this.toggleDeviceOnOff(matterDevice, power);
			}
		}

		if (levelControlClient) {
			const brightness = this.services
				.getDataService()
				.readLatestValue(deviceIdString, MEASUREMENT_BRIGHTNESS);
			const levelControlStatus =
				await levelControlClient.getCurrentLevelAttribute();

			if (brightness && levelControlStatus !== brightness.value) {
				await this.toggleDeviceLevel(matterDevice, brightness);
			}
		}
	}

	override control(
		deviceId: string,
		measurementId: string,
		value: Value
	): Promise<void> {
		const matterDevice = this.matterDevices.find(
			(matterDevice) => String(matterDevice.number) === deviceId
		);

		if (!matterDevice) {
			throw new Error(`Matter device ${deviceId} not commissioned`);
		}

		switch (measurementId) {
			case MEASUREMENT_POWER:
				return this.toggleDeviceOnOff(matterDevice, value);
			case MEASUREMENT_BRIGHTNESS:
				return this.toggleDeviceLevel(matterDevice, value);
			default:
				throw new Error(
					`Unrecognized measurement type ${measurementId}`
				);
		}
	}

	async toggleDeviceOnOff(matterDevice: Endpoint, value: Value) {
		const client = matterDevice.getClusterClient(OnOff);

		if (client) {
			if (value.value) {
				await client.on();
			} else {
				await client.off();
			}
		} else {
			throw new Error(
				`Missing OnOff client for device "${matterDevice.name}"`
			);
		}
	}

	async toggleDeviceLevel(matterDevice: Endpoint, value: Value) {
		const client = matterDevice.getClusterClient(LevelControl);

		if (client) {
			const opts = {
				level: value.value as number,
				transitionTime: null,
				optionsMask: {},
				optionsOverride: {}
			} satisfies LevelControl.MoveToLevelRequest;

			await client.moveToLevel(opts);
		} else {
			throw new Error(
				`Missing LevelControl client for device "${matterDevice.name}"`
			);
		}
	}
}
