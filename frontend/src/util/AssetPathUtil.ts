import { Asset } from "../interface/Asset";

export interface ResolvedAssetPath {
	asset?: Asset;
	/** Asset ids from the root asset to `asset`. */
	assetIds: string[];
	/** Segments after the asset ids: device id and optional section. */
	rest: string[];
}

export function resolveAssetPath(
	assets: Asset[],
	segments: string[]
): ResolvedAssetPath {
	const assetIds: string[] = [];
	let asset: Asset | undefined;

	for (const [index, segment] of segments.entries()) {
		const next: Asset | undefined =
			index === 0
				? assets.find((a) => a.isRootAsset && a.id === segment)
				: asset?.children.includes(segment)
					? assets.find((a) => a.id === segment)
					: undefined;

		if (!next) {
			break;
		}

		asset = next;
		assetIds.push(next.id);
	}

	return { asset, assetIds, rest: segments.slice(assetIds.length) };
}

/** Finds the first path from a root asset to the asset, in config order. */
export function findAssetPath(
	assets: Asset[],
	assetId: string
): string[] | undefined {
	const search = (asset: Asset, path: string[]): string[] | undefined => {
		const current = [...path, asset.id];

		if (asset.id === assetId) {
			return current;
		}

		for (const childId of asset.children) {
			const child = assets.find((a) => a.id === childId);
			const found = child && search(child, current);

			if (found) {
				return found;
			}
		}

		return undefined;
	};

	for (const root of assets.filter((a) => a.isRootAsset)) {
		const found = search(root, []);

		if (found) {
			return found;
		}
	}

	return undefined;
}
