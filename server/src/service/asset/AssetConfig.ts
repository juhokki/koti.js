export default interface AssetConfig {
	id: string;
	name: string;
	icon: string;
	isRootAsset?: boolean;
	children?: string[];
	devices: string[];
	deviceNameOverrides?: { id: string; name: string }[];
	isSummaryAsset?: boolean;
	measurementFilter?: string | null;
}
