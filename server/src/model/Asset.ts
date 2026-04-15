import type Device from "./Device.js";

export default class Asset {
	id: string;
	name: string;
	icon: string;
	devices: Device[];

	constructor(id: string, name: string, icon: string, devices: Device[]) {
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.devices = devices;
	}
}
