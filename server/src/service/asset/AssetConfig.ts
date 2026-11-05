export default interface AssetConfig {
	id: string;
	name: string;
	icon: string;
	links?: string[];
	devices?: string[];
	summary?: {
		devices: {
			id: string;
			name: string;
			measurements: string[];
		}[];
	};
}
