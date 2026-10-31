import type Device from "./Device.ts";

export default class Asset {
	id: string;
	name: string;
	icon: string;
	isRootAsset: boolean;
	children: string[];
	devices: Device[];

	constructor(
		id: string,
		name: string,
		icon: string,
		isRootAsset: boolean,
		children: string[],
		devices: Device[]
	) {
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.isRootAsset = isRootAsset;
		this.children = children;
		this.devices = devices;
	}
}
