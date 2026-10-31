export default interface AssetConfig {
	id: string;
	name: string;
	icon: string;
	isRootAsset?: boolean;
	children?: string[];
	devices: string[];
}
