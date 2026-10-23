import { afterEach, beforeEach, expect, test, vi } from "vitest";
import AuthUtil from "../../src/util/AuthUtil";
import CssUtil from "../../src/util/CssUtil";
import {
	formatTime,
	getEndOfDay,
	getEndOfMonth,
	getStartOfDay,
	getStartOfMonth,
	shortDate,
	timeElapsed
} from "../../src/util/TimeUtil";
import ValueUtil from "../../src/util/ValueUtil";

const originalComputedStyle = CssUtil.computedStyle;

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	vi.useRealTimers();
	localStorage.clear();
	CssUtil.computedStyle = originalComputedStyle;
});

test("Builds an authorization header only when a token exists", () => {
	expect(AuthUtil.buildAuthorization()).toBe("");

	localStorage.setItem("jwt", "test-token");

	expect(AuthUtil.buildAuthorization()).toBe("Bearer test-token");
});

test("Creates stable device and measurement value keys", () => {
	expect(ValueUtil.createValueKey("device-1", "temperature")).toBe(
		"device-1-temperature"
	);
});

test("Reads CSS variables as text and integers", () => {
	CssUtil.computedStyle = {
		getPropertyValue: () => "42px"
	} as CSSStyleDeclaration;

	expect(CssUtil.getVar("--test-variable")).toBe("42px");
	expect(CssUtil.getVarInt("--test-variable")).toBe(42);
});

test("Formats elapsed time across all display ranges", () => {
	const now = new Date(2024, 0, 3, 12).getTime();
	vi.useFakeTimers();
	vi.setSystemTime(now);

	expect(timeElapsed(0)).toBe("Ei arvoa");
	expect(timeElapsed(now - 30_000)).toBe("Hetki sitten");
	expect(timeElapsed(now - 60_000)).toBe("1 minuutti sitten");
	expect(timeElapsed(now - 120_000)).toBe("2 minuuttia sitten");
	expect(timeElapsed(now - 3_600_000)).toBe("1 tunti sitten");
	expect(timeElapsed(now - 7_200_000)).toBe("2 tuntia sitten");
	expect(timeElapsed(now - 86_400_000)).toBe("1 päivä sitten");
	expect(timeElapsed(now - 172_800_000)).toBe("2 päivää sitten");
});

test("Formats short dates and clock times", () => {
	const date = new Date(2024, 8, 7, 14, 5, 6);

	expect(shortDate(date)).toBe("7.9.");
	expect(formatTime(date.getTime())).toBe(
		date.toLocaleTimeString("fi-FI", { hour12: false })
	);
});

test("Returns day and month boundaries without mutating the input", () => {
	const date = new Date(2024, 1, 15, 12, 34, 56, 0);

	expect(getStartOfDay(date)).toEqual(new Date(2024, 1, 15, 0, 0, 0, 0));
	expect(getEndOfDay(date)).toEqual(new Date(2024, 1, 15, 23, 59, 59, 999));
	expect(getStartOfMonth(date)).toEqual(new Date(2024, 1, 1, 0, 0, 0, 0));
	expect(getEndOfMonth(date)).toEqual(new Date(2024, 1, 29, 23, 59, 59, 0));
	expect(date).toEqual(new Date(2024, 1, 15, 12, 34, 56, 0));
});