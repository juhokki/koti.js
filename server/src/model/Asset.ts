import type Device from "./Device.ts";
import type Measurement from "./Measurement.ts";

export interface AssetSummaryDevice {
	device: Device;
	displayName: string;
	measurements: Measurement[];
}

export interface AssetSummary {
	devices: AssetSummaryDevice[];
}

export default class Asset {
	id: string;
	name: string;
	icon: string;
	links: string[];
	devices: Device[];
	summary: AssetSummary | null;

	constructor(
		id: string,
		name: string,
		icon: string,
		links: string[],
		devices: Device[],
		summary: AssetSummary | null
	) {
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.links = links;
		this.devices = devices;
		this.summary = summary;
	}
}
