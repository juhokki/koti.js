import { Asset } from "../interface/Asset";

export function findDeviceAsset(
	deviceId: string,
	assets: Asset[]
): Asset | undefined {
	let foundAsset = undefined;

	for (const asset of assets) {
		for (const assignedDeviceId of asset.deviceIds) {
			if (assignedDeviceId === deviceId) {
				foundAsset = asset;
			}
		}
	}

	return foundAsset;
}
