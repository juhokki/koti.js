import dgram from "node:dgram";
import {
	Bulb,
	DEFAULT_DISCOVER_WAIT_MS,
	WIZ_BULB_LISTEN_PORT,
	type SyncPilotMsg
} from "wikari";
import DeviceOnlineStatus from "../../../enums/DeviceOnlineStatus.js";
import DeviceType from "../../../enums/DeviceType.js";
import Value from "../../../model/Value.js";
import type ServiceLocator from "../../ServiceLocator.js";
import Integration from "../IntegrationBase.js";
import type WizIntegrationSettings from "./WizIntegrationSettings.js";

export const BULB_STATE_READY = 2;
export const DEVICE_OFFLINE_LIMIT = 60000;
export const MEASUREMENT_POWER = "power";
export const MEASUREMENT_BRIGHTNESS = "brightness";

export interface WizDiscoverResponseResult {
	mac: string;
}

export interface WizDiscoverResponse {
	env: string;
	result: WizDiscoverResponseResult;
}

export default class WizIntegration extends Integration {
	options: WizIntegrationSettings;
	bulbs: Bulb[];
	bulbLastHeartbeat: Map<string, number>;
	bulbLastValueUpdates: Map<string, number>;
	discoverIntervalId: NodeJS.Timeout | undefined;
	heartbeatCheckIntervalId: NodeJS.Timeout | undefined;

	constructor(services: ServiceLocator, options: WizIntegrationSettings) {
		super(services);

		this.options = options;
		this.bulbs = [];
		this.bulbLastHeartbeat = new Map();
		this.bulbLastValueUpdates = new Map();
	}

	override async start() {
		const assetService = this.services.getAssetService();

		assetService
			.getDevicesWithType(DeviceType.WizIntegration)
			.forEach((device) => {
				assetService.setDeviceOnlineStatus(
					device.id,
					DeviceOnlineStatus.OFFLINE
				);
			});

		await this.discover();

		this.discoverIntervalId = setInterval(() => {
			this.discover().catch((e: unknown) => {
				console.log("Discover failed.", e);
			});
		}, this.options.discoverInterval);

		this.heartbeatCheckIntervalId = setInterval(() => {
			this.checkHeartbeats();
		}, this.options.heartbeatInterval);
	}

	override stop() {
		this.bulbs.forEach((bulb) => {
			bulb.closeConnection();
		});

		if (this.discoverIntervalId) {
			clearInterval(this.discoverIntervalId);
		}

		if (this.heartbeatCheckIntervalId) {
			clearInterval(this.heartbeatCheckIntervalId);
		}

		return Promise.resolve();
	}

	async discover() {
		const newBulbs: Bulb[] = [];
		const addr = this.options.address;
		const client = dgram.createSocket("udp4");
		const message = {
			method: "getPilot",
			params: {}
		};

		if (addr.split(".").includes("255")) {
			client.once("listening", () => {
				client.setBroadcast(true);
			});
		}

		const listener = (msg: string, rinfo: Record<string, string>) => {
			const response = JSON.parse(msg.toString()) as WizDiscoverResponse;

			if (response.env !== "pro") {
				return; // Skip if not pro env
			}

			if (
				typeof rinfo === "object" &&
				typeof rinfo.address !== "undefined"
			) {
				const isNewBulb = !this.bulbs.find(
					(b) => b.macIdentifier === response.result.mac
				);

				if (isNewBulb) {
					const bulb = new Bulb(rinfo.address, {
						port: WIZ_BULB_LISTEN_PORT,
						macIdentifier: response.result.mac
					});

					newBulbs.push(bulb);
				}
			}
		};

		client.on("message", listener);
		client.send(JSON.stringify(message), WIZ_BULB_LISTEN_PORT, addr);

		await this.sleep(DEFAULT_DISCOVER_WAIT_MS);

		client.off("message", listener);
		client.close();

		newBulbs.forEach((bulb) => {
			this.onBulbDiscovered(bulb).catch((e: unknown) => {
				console.log("Bulb discovery failed.", e);
			});
		});
	}

	async onBulbDiscovered(bulb: Bulb) {
		console.log(`Discovered Wiz device with id ${bulb.macIdentifier}.`);

		this.bulbs.push(bulb);
		this.services
			.getAssetService()
			.setDeviceOnlineStatus(
				bulb.macIdentifier,
				DeviceOnlineStatus.ONLINE
			);

		await bulb.subscribe(this.options.interface);

		bulb.onSync((syncPilotMsg) => {
			this.onBulbSync(syncPilotMsg).catch((e: unknown) => {
				console.log("Bulb sync failed.", e);
			});
		});

		await this.getAndWriteBulbStatus(bulb);
	}

	checkHeartbeats() {
		const assetService = this.services.getAssetService();

		this.bulbs.forEach((bulb) => {
			const lastHeartbeat = this.bulbLastHeartbeat.get(
				bulb.macIdentifier
			);
			let status;

			if (lastHeartbeat) {
				status =
					lastHeartbeat + DEVICE_OFFLINE_LIMIT >= Date.now()
						? DeviceOnlineStatus.ONLINE
						: DeviceOnlineStatus.OFFLINE;
			} else {
				status = DeviceOnlineStatus.OFFLINE;
			}

			assetService.setDeviceOnlineStatus(bulb.macIdentifier, status);
		});
	}

	async getAndWriteBulbStatus(bulb: Bulb) {
		const pilot = await bulb.getPilot();
		const timestamp = Date.now();
		const values = [
			new Value(pilot.result.mac, "power", pilot.result.state, timestamp)
		];

		if (pilot.result.dimming) {
			values.push(
				new Value(
					pilot.result.mac,
					"brightness",
					pilot.result.dimming,
					timestamp
				)
			);
		}

		this.bulbLastValueUpdates.set(pilot.result.mac, timestamp);

		return this.services.getDataService().write(values);
	}

	async onBulbSync(syncPilotMsg: SyncPilotMsg) {
		this.bulbLastHeartbeat.set(syncPilotMsg.params.mac, Date.now());

		if (syncPilotMsg.params.ts) {
			const prevTimestamp = this.bulbLastValueUpdates.get(
				syncPilotMsg.params.mac
			);

			if (prevTimestamp && prevTimestamp >= syncPilotMsg.params.ts) {
				return; // Ignore message if it has not updated
			}

			this.bulbLastValueUpdates.set(
				syncPilotMsg.params.mac,
				syncPilotMsg.params.ts
			);

			const values = [];

			if (syncPilotMsg.params.state) {
				values.push(
					new Value(
						syncPilotMsg.params.mac,
						"power",
						syncPilotMsg.params.state,
						syncPilotMsg.params.ts
					)
				);
			}

			if (syncPilotMsg.params.dimming) {
				values.push(
					new Value(
						syncPilotMsg.params.mac,
						"brightness",
						syncPilotMsg.params.dimming,
						syncPilotMsg.params.ts
					)
				);
			}

			await this.services.getDataService().write(values);
		}
	}

	override async control(
		deviceId: string,
		measurementId: string,
		value: Value
	): Promise<void> {
		const bulb = this.bulbs.find((b) => b.macIdentifier === deviceId);

		if (!bulb) {
			throw new Error(`Wiz bulb ${deviceId} not discovered`);
		}

		// TODO: Static attribute. Does this work for multiple bulbs?
		//if (Bulb.state as number !== BULB_STATE_READY) {
		//	throw new Error(`Wiz bulb ${deviceId} is not ready to be controlled.`);
		//}

		switch (measurementId) {
			case "power":
				await bulb.turn(value.value as boolean);
				break;
			case "brightness":
				await bulb.brightness(value.value as number);
				break;
			default:
				throw new Error(`Unknown bulb measurement ${measurementId}.`);
		}
	}

	sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
