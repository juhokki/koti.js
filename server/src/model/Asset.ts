export interface AssetSummaryDevice {
	deviceId: string;
	displayName: string;
	measurementIds: string[];
}

export interface AssetSummary {
	devices: AssetSummaryDevice[];
}

export default class Asset {
	id: string;
	name: string;
	icon: string;
	links: string[];
	deviceIds: string[];
	summary: AssetSummary | null;

	constructor(
		id: string,
		name: string,
		icon: string,
		links: string[],
		deviceIds: string[],
		summary: AssetSummary | null
	) {
		this.id = id;
		this.name = name;
		this.icon = icon;
		this.links = links;
		this.deviceIds = deviceIds;
		this.summary = summary;
	}
}
