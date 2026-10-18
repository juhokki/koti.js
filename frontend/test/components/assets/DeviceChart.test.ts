import { describe, expect, it } from "vitest";
import {
	downsample,
	getHighlightIndexes
} from "../../../src/components/assets/device/DeviceChart";

const point = (minutes: number, y: number | boolean) => ({
	x: new Date(2026, 0, 1, 0, minutes),
	y
});

describe("downsample", () => {
	it("sorts short input ascending", () => {
		const result = downsample([point(2, 1), point(1, 2)]);

		expect(result.map((p) => p.y)).toEqual([2, 1]);
	});

	it("caps numeric points and keeps extremes", () => {
		const points = Array.from({ length: 2000 }, (_, i) =>
			point(i, i === 1000 ? 999 : i === 500 ? -999 : 1)
		);
		const result = downsample(points, 100);
		const values = result.map((p) => p.y);

		expect(result.length).toBeLessThanOrEqual(100);
		expect(values).toContain(999);
		expect(values).toContain(-999);
	});

	it("keeps only changes for non-numeric values", () => {
		const points = [true, true, true, false, false, true].map((v, i) =>
			point(i, v)
		);

		expect(downsample(points, 2).map((p) => p.y)).toEqual([
			true,
			false,
			true
		]);
	});
});

describe("getHighlightIndexes", () => {
	it("returns empty set for no points", () => {
		expect(getHighlightIndexes([]).size).toBe(0);
	});

	it("includes first, last, and daily min and max", () => {
		const day2 = (h: number, y: number) => ({
			x: new Date(2026, 0, 2, h),
			y
		});
		const points = [
			point(0, 5),
			point(1, 1),
			point(2, 9),
			day2(0, 4),
			day2(1, 3),
			day2(2, 6)
		];
		const result = getHighlightIndexes(points);

		expect([...result].sort()).toEqual([0, 1, 2, 4, 5]);
	});
});
