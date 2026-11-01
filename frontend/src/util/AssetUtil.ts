import { Asset } from "../interface/Asset";

export function findDeviceAsset(
	deviceId: string,
	assets: Asset[]
): Asset | undefined {
	let foundAsset = undefined;

	for (const asset of assets) {
		for (const device of asset.devices) {
			if (device.id === deviceId) {
				foundAsset = asset;
			}
		}
	}

	return foundAsset;
}
