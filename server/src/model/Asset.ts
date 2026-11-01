import type Device from "./Device.ts";

export default class Asset {
	id: string;
	name: string;
	icon: string;
	isRootAsset: boolean;
	children: string[];
	devices: Device[];
	deviceNameOverrides: { id: string; name: string }[];
	isSummaryAsset: boolean;
	measurementFilter: string | null;

	constructor(
		id: string,
		name: string,
		icon: string,
		isRootAsset: boolean,
		children: string[],
		devices: Device[],
		deviceNameOverrides: { id: string; name: string }[],
		isSummaryAsset: boolean,
		measurementFilter: string | null
	) {
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.isRootAsset = isRootAsset;
		this.children = children;
		this.devices = devices;
		this.deviceNameOverrides = deviceNameOverrides;
		this.isSummaryAsset = isSummaryAsset;
		this.measurementFilter = measurementFilter;
	}
}
