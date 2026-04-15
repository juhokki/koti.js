import fetch from "node-fetch";
import IntegrationBase from "../IntegrationBase.js";
import Value from "../../../model/Value.js";
import type ToshibaAcIntegrationSettings from "./ToshibaAcIntegrationConfig.js";
import type ServiceLocator from "../../ServiceLocator.js";

export interface DeviceState {
	ac_status: number;
	ac_mode: number;
	ac_temperature: number;
	ac_fan_mode: number;
	ac_swing_mode: number;
	ac_power_selection: number;
	ac_merit_b: number;
	ac_merit_a: number;
	ac_air_pure_ion: number;
	ac_indoor_temperature: number;
	ac_outdoor_temperature: number;
	ac_self_cleaning: number;
}

export interface GetDeviceStateResponseACStateData {
	ACStateData: string;
}

export interface GetDeviceStateResponse extends ToshibaAcResponse {
	ResObj: GetDeviceStateResponseACStateData;
}

export interface DevicesResponseAcListDevice {
	Id: string;
}

export interface DevicesResponseAcList {
	ACList: DevicesResponseAcListDevice[];
}

export interface DevicesResponse extends ToshibaAcResponse {
	ResObj: DevicesResponseAcList[];
}

export interface Token {
	consumerId: "string";
	token_type: string;
	access_token: string;
}

export interface LoginResponse extends ToshibaAcResponse {
	ResObj: Token;
}

export interface ToshibaAcResponse {
	IsSuccess: boolean;
}

export interface ToshibaAcDevice {
	id: string;
}

// TODO:
// - Integration is NOT READY!
// - Compare: https://github.com/KaSroka/Toshiba-AC-control/blob/main/toshiba_ac/device_manager.py
// - Check if works (run py gui and compare)
// - Add interval update
// - Fix lint
export default class ToshibaAcIntegration extends IntegrationBase {
	options: ToshibaAcIntegrationSettings;
	token: Token | undefined;
	devices: ToshibaAcDevice[];

	constructor(
		services: ServiceLocator,
		options: ToshibaAcIntegrationSettings
	) {
		super(services);

		this.options = options;
		this.devices = [];
	}

	override async start() {
		if (!this.options.sasToken) {
			throw new Error("Sas token not provided. Register client first.");
		}

		await this.login();
		this.devices = await this.getDevices();

		await this.updateDeviceStates();
		//await this.updateDeviceEnergyConsumptions();
	}

	async login() {
		if (!this.options.username || !this.options.password) {
			throw new Error("Missing credentials.");
		}

		const url =
			"https://mobileapi.toshibahomeaccontrols.com/api/Consumer/Login";
		const options = {
			method: "POST",
			body: JSON.stringify({
				Username: this.options.username,
				Password: this.options.password
			}),
			headers: {
				"Content-Type": "application/json"
			}
		};

		const response = await fetch(url, options);
		const data = (await response.json()) as LoginResponse;

		if (data.IsSuccess) {
			this.token = data.ResObj;
		} else {
			throw new Error("Authentication rejected.");
		}
	}

	async getDevices() {
		if (!this.token) {
			throw new Error("Missing token");
		}

		const url = `https://mobileapi.toshibahomeaccontrols.com/api/AC/GetConsumerACMapping?consumerId=${this.token.consumerId}`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `${this.token.token_type} ${this.token.access_token}`
			}
		};

		const response = await fetch(url, options);
		const data = (await response.json()) as DevicesResponse;

		if (!data.IsSuccess) {
			throw new Error(
				"ToshibaAcIntegration GetConsumerACMapping failed."
			);
		}

		const devices: ToshibaAcDevice[] = [];

		data.ResObj.forEach((group) => {
			group.ACList.forEach((device) => {
				devices.push({
					id: device.Id
				});
			});
		});

		return devices;
	}

	async updateDeviceStates() {
		for (const device of this.devices) {
			const state = await this.getDeviceState(device);
			const values = [new Value(device.id, "power", state.ac_status)];

			await this.services.getDataService().write(values);
		}
	}

	async getDeviceState(device: ToshibaAcDevice): Promise<DeviceState> {
		if (!this.token) {
			throw new Error("Missing token");
		}

		const url = `https://mobileapi.toshibahomeaccontrols.com/api/AC/GetCurrentACState?ACId=${device.id}`;
		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `${this.token.token_type} ${this.token.access_token}`
			}
		};

		const response = await fetch(url, options);
		const data = (await response.json()) as GetDeviceStateResponse;

		if (!data.IsSuccess) {
			throw new Error("ToshibaAcIntegration GetCurrentACState failed.");
		}

		const state = data.ResObj.ACStateData;
		const extendedState =
			state.slice(0, 12) +
			"0" +
			String(state[12]) +
			"0" +
			state.slice(13);
		const hexToBytes = (hex: string) => {
			const bytes = [];

			for (let c = 0; c < hex.length; c += 2) {
				const end = c + 2;
				bytes.push(parseInt(hex.substring(c, end), 16));
			}

			return bytes;
		};
		const bytes = hexToBytes(extendedState) as [
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number,
			number
		];

		// TODO: enums? ((66).toString(16);) fcu_state.py
		return {
			ac_status: bytes[0],
			ac_mode: bytes[1],
			ac_temperature: bytes[2],
			ac_fan_mode: bytes[3],
			ac_swing_mode: bytes[4],
			ac_power_selection: bytes[5],
			ac_merit_b: bytes[6],
			ac_merit_a: bytes[7],
			ac_air_pure_ion: bytes[8],
			ac_indoor_temperature: bytes[9],
			ac_outdoor_temperature: bytes[10],
			ac_self_cleaning: bytes[15]
		};
	}

	/*
	async updateDeviceEnergyConsumptions() {
		for (const device of this.devices) {
			const state = await this.getDeviceEnergyConsumption(device);
			const values = [new Value(device.id, "", state)];

			await this.services.get("DataService").write(values);
		}
	}

	async getDeviceEnergyConsumption(device) {
		const year = new Date().getFullYear();
		const url = "https://mobileapi.toshibahomeaccontrols.com/api/AC/GetGroupACEnergyConsumption";
		const options = {
			"method": "POST",
			"body": JSON.stringify({
				"ACDeviceUniqueIdList": [device.id],
				"FromUtcTime": year.toString(),
				"Timezone": "UTC",
				"ToUtcTime": (year + 1).toString(),
				"Type": "EnergyYear"
			}),
			"headers": {
				"Content-Type": "application/json",
				"Authorization": `${this.token.token_type} ${this.token.access_token}`
			}
		};

		const response = await fetch(url, options);
		const data = await response.json();

		if (!data.IsSuccess) {
			throw new Error("ToshibaAcIntegration GetGroupACEnergyConsumption failed.");
		}

		return data.ResObj;
	}
	*/
}
