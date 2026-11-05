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
	let asset = assets.find((candidate) => candidate.id === "root");

	for (const segment of segments) {
		const next = asset?.links?.includes(segment)
			? assets.find((candidate) => candidate.id === segment)
			: undefined;

		if (!next) {
			break;
		}

		asset = next;
		assetIds.push(next.id);
	}

	return { asset, assetIds, rest: segments.slice(assetIds.length) };
}

/** Finds the first path from the hardcoded root asset, in config order. */
export function findAssetPath(
	assets: Asset[],
	assetId: string
): string[] | undefined {
	const search = (
		asset: Asset,
		path: string[],
		visited: Set<string>
	): string[] | undefined => {
		if (asset.id === assetId) {
			return path;
		}

		for (const linkedAssetId of asset.links ?? []) {
			if (visited.has(linkedAssetId)) {
				continue;
			}

			const linkedAsset = assets.find(
				(candidate) => candidate.id === linkedAssetId
			);
			const found =
				linkedAsset &&
				search(
					linkedAsset,
					[...path, linkedAssetId],
					new Set([...visited, linkedAssetId])
				);

			if (found) {
				return found;
			}
		}

		return undefined;
	};

	const root = assets.find((asset) => asset.id === "root");
	return root ? search(root, [], new Set([root.id])) : undefined;
}
