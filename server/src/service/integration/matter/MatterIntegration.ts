import { Environment, Logger, StorageService } from "@matter/main";
import { LevelControl, OnOff } from "@matter/main/clusters";
import type { EndpointInterface } from "@matter/main/protocol";
import { NodeId, type TypeFromPartialBitSchema } from "@matter/main/types";
import {
	CommissioningController,
	type CommissioningControllerOptions
} from "@project-chip/matter.js";
import { NodeStates } from "@project-chip/matter.js/device";
import DeviceOnlineStatus from "../../../enums/DeviceOnlineStatus.js";
import DeviceType from "../../../enums/DeviceType.js";
import Value from "../../../model/Value.js";
import type ServiceLocator from "../../ServiceLocator.js";
import IntegrationBase from "../IntegrationBase.js";
import type MatterIntegrationSettings from "./MatterIntegrationConfig.js";

export const MEASUREMENT_POWER = "power";
export const MEASUREMENT_BRIGHTNESS = "brightness";

export default class MatterIntegration extends IntegrationBase {
	options: MatterIntegrationSettings;
	matterDevices: EndpointInterface[];

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
		const storageService = environment.get(StorageService);
		storageService.location = this.options.storageLocation;

		const controllerStorage = (
			await storageService.open("controller")
		).createContext("data");

		await controllerStorage.set("uniqueid", this.options.controllerId);

		const commissioningOptions: CommissioningControllerOptions = {
			environment: {
				environment: environment,
				id: this.options.controllerId
			},
			autoConnect: false
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
		const pairedNode = await commissioningController.connectNode(nodeId);
		const devices = pairedNode.getDevices();

		pairedNode.events.stateChanged.on((info) =>
			this.onNodeStateChanged(info, devices)
		);

		for (const matterDevice of devices) {
			await this.getMatterDeviceValues(matterDevice);
		}
	}

	async getMatterDeviceValues(matterDevice: EndpointInterface) {
		const deviceIdString = String(matterDevice.number);

		try {
			this.services.getAssetService().getDevice(deviceIdString);
		} catch (e) {
			console.log(
				`Discovered Matter device with id ${deviceIdString} is not configured. Ignoring.`
			);
			return;
		}

		console.log(`Discovered Matter device with id ${deviceIdString}.`);

		this.matterDevices.push(matterDevice);

		const values = [];
		const onOffClient = matterDevice.getClusterClient(OnOff.Complete);
		const levelControlClient = matterDevice.getClusterClient(
			LevelControl.Complete
		);

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
						console.log("Failed to write value", e);
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
								console.log("Failed to write value", e);
							});
					}
				});
			}
		}

		await this.services.getDataService().write(values);
	}

	async onNodeStateChanged(info: NodeStates, devices: EndpointInterface[]) {
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
					await this.updateDevicePreviousState(matterDevice);
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

	async updateDevicePreviousState(matterDevice: EndpointInterface) {
		const deviceIdString = String(matterDevice.number);
		const onOffClient = matterDevice.getClusterClient(OnOff.Complete);
		const levelControlClient = matterDevice.getClusterClient(
			LevelControl.Complete
		);

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

	async toggleDeviceOnOff(matterDevice: EndpointInterface, value: Value) {
		const client = matterDevice.getClusterClient(OnOff.Complete);

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

	async toggleDeviceLevel(matterDevice: EndpointInterface, value: Value) {
		const client = matterDevice.getClusterClient(LevelControl.Complete);

		if (client) {
			const opts = {
				level: value.value as number,
				transitionTime: null,
				optionsMask: 0 as TypeFromPartialBitSchema<
					typeof LevelControl.Options
				>,
				optionsOverride: 0 as TypeFromPartialBitSchema<
					typeof LevelControl.Options
				>
			};

			await client.moveToLevel(opts);
		} else {
			throw new Error(
				`Missing LevelControl client for device "${matterDevice.name}"`
			);
		}
	}
}
