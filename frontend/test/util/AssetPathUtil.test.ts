import { expect, test } from "vitest";
import { findAssetPath, resolveAssetPath } from "../../src/util/AssetPathUtil";
import { Asset } from "../../src/interface/Asset";

const create = (id: string, links: string[] = []): Asset => ({
	id,
	name: id,
	icon: "home",
	links,
	deviceIds: []
});

const assets = [
	create("root", ["house", "cabin"]),
	create("house", ["kitchen"]),
	create("cabin", ["kitchen"]),
	create("kitchen")
];

test("resolveAssetPath follows linked ids and returns remaining segments", () => {
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

test("resolveAssetPath uses root implicitly and follows links", () => {
	expect(resolveAssetPath(assets, []).asset?.id).toBe("root");
	expect(resolveAssetPath(assets, ["cabin", "kitchen"]).asset?.id).toBe(
		"kitchen"
	);
	expect(resolveAssetPath(assets, ["kitchen"]).assetIds).toEqual([]);
});

test("findAssetPath returns the first path from the hardcoded root", () => {
	expect(findAssetPath(assets, "root")).toEqual([]);
	expect(findAssetPath(assets, "kitchen")).toEqual(["house", "kitchen"]);
	expect(findAssetPath(assets, "cabin")).toEqual(["cabin"]);
	expect(findAssetPath(assets, "missing")).toBeUndefined();
});

test("findAssetPath does not recurse indefinitely through link cycles", () => {
	const cyclicAssets = [create("root", ["a"]), create("a", ["root"])];

	expect(findAssetPath(cyclicAssets, "a")).toEqual(["a"]);
	expect(findAssetPath(cyclicAssets, "missing")).toBeUndefined();
});
