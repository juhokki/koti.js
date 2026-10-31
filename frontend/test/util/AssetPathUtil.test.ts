import { expect, test } from "vitest";
import { findAssetPath, resolveAssetPath } from "../../src/util/AssetPathUtil";
import { Asset } from "../../src/interface/Asset";

const create = (
	id: string,
	isRootAsset: boolean,
	children: string[]
): Asset => ({
	id,
	name: id,
	icon: "home",
	isRootAsset,
	children,
	devices: []
});

const assets = [
	create("house", true, ["kitchen"]),
	create("cabin", true, ["kitchen"]),
	create("kitchen", false, [])
];

test("resolveAssetPath follows child ids and returns remaining segments", () => {
	const result = resolveAssetPath(assets, [
		"house",
		"kitchen",
		"device-1",
		"alarms"
	]);

	expect(result.asset?.id).toBe("kitchen");
	expect(result.assetIds).toEqual(["house", "kitchen"]);
	expect(result.rest).toEqual(["device-1", "alarms"]);
});

test("resolveAssetPath requires a root asset first and valid children", () => {
	expect(resolveAssetPath(assets, ["kitchen"]).asset).toBeUndefined();
	expect(resolveAssetPath(assets, ["house", "cabin"]).assetIds).toEqual([
		"house"
	]);
});

test("findAssetPath returns the first path from a root asset", () => {
	expect(findAssetPath(assets, "kitchen")).toEqual(["house", "kitchen"]);
	expect(findAssetPath(assets, "cabin")).toEqual(["cabin"]);
	expect(findAssetPath(assets, "missing")).toBeUndefined();
});
