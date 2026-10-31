import { useContext } from "react";
import { useParams } from "react-router-dom";
import { AssetsContext } from "../context/AssetsContext";
import { resolveAssetPath } from "../util/AssetPathUtil";

export default function useAssetPath() {
	const assets = useContext(AssetsContext).assets;
	const splat = useParams()["*"] ?? "";
	const { asset, assetIds, rest } = resolveAssetPath(
		assets,
		splat.split("/").filter(Boolean)
	);

	return {
		asset,
		assetPath: `/assets/${assetIds.join("/")}`,
		parentPath: `/assets${assetIds
			.slice(0, -1)
			.map((id) => `/${id}`)
			.join("")}`,
		deviceId: rest[0],
		section: rest[1]
	};
}
