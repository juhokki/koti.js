import { expect, vi, test, beforeEach } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Value from "../../src/model/Value.js";
import ElectricityPriceIntegration from "../../src/service/integration/electricityprice/ElectricityPriceIntegration.js";
import type ElectricityPriceIntegrationConfig from "../../src/service/integration/electricityprice/ElectricityPriceIntegrationConfig.js";
import type DataService from "../../src/service/data/DataService.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import DeviceType from "../../src/constants/DeviceType.js";

const mockFetch = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());
const mockSchedule = vi.hoisted(() => vi.fn());
const mockTaskStop = vi.hoisted(() => vi.fn());

const mockGetDevicesWithType = vi.hoisted(() => vi.fn());

vi.mock("node-fetch", () => ({ default: mockFetch }));
vi.mock("node-cron", () => ({ default: { schedule: mockSchedule } }));

const services = new ServiceLocator(
	new Map<string, ServiceBase>([
		["DataService", { write: mockWrite } as unknown as DataService],
		[
			"AssetService",
			{
				getDevicesWithType: mockGetDevicesWithType
			} as unknown as AssetService
		]
	])
);

const deviceId = "electricityprice";

const settings = {
	enabled: true,
	name: "ElectricityPriceIntegration",
	region: "FI",
	cron: "*/15 * * * *"
} satisfies ElectricityPriceIntegrationConfig;

const now = new Date(2026, 10, 3, 12, 20, 0).getTime();
vi.useFakeTimers();

function entry(date: Date, price: number | null, dateTime?: string | null) {
	return {
		Rank: 1,
		DateTime: dateTime === undefined ? date.toISOString() : dateTime,
		PriceNoTax: 0,
		PriceWithTax: price
	};
}

function mockResponse(entries: unknown[], ok = true, status = 200) {
	mockFetch.mockReturnValueOnce(
		Promise.resolve({ ok, status, json: () => entries })
	);
}

beforeEach(() => {
	vi.setSystemTime(now);
	vi.clearAllMocks();
	mockSchedule.mockReturnValue({ stop: mockTaskStop });
	mockGetDevicesWithType.mockReturnValue([{ id: deviceId }]);
});

test("ElectricityPriceIntegration writes prices in cents", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	mockResponse([
		entry(new Date(2026, 10, 3, 12, 0), 0.1),
		entry(new Date(2026, 10, 3, 12, 15), 0.1234),
		entry(new Date(2026, 10, 3, 12, 30), 0.2),
		entry(new Date(2026, 10, 4, 0, 0), 0.3),
		entry(new Date(2026, 10, 4, 0, 15), 0.5)
	]);

	await integration.start();

	expect(mockFetch).toHaveBeenLastCalledWith(
		"https://api.spot-hinta.fi/TodayAndDayForward?region=FI&priceResolution=15",
		{ method: "GET" }
	);
	expect(mockSchedule).toHaveBeenCalledWith(
		settings.cron,
		expect.any(Function)
	);
	expect(mockGetDevicesWithType).toHaveBeenCalledWith(
		DeviceType.ElectricityPriceIntegration
	);
	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value(deviceId, "currentPrice", 12.34),
		new Value(deviceId, "averagePriceToday", 14.11),
		new Value(deviceId, "averagePriceTomorrow", 40)
	]);
	expect(integration.getParameters()).toEqual([
		{ name: "Region", value: "FI" },
		{ name: "Schedule", value: settings.cron },
		{ name: "Last updated", value: new Date(now).toISOString() }
	]);
});

test("ElectricityPriceIntegration omits missing tomorrow and skips null entries", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	mockResponse([
		entry(new Date(2026, 10, 3, 12, 15), 0.1),
		entry(new Date(2026, 10, 3, 12, 30), null),
		entry(new Date(2026, 10, 3, 12, 45), 0.2, null)
	]);

	await integration.update();

	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value(deviceId, "currentPrice", 10),
		new Value(deviceId, "averagePriceToday", 10)
	]);
});

test("ElectricityPriceIntegration omits currentPrice when no slot matches", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	mockResponse([entry(new Date(2026, 10, 3, 8, 0), 0.1)]);

	await integration.update();

	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value(deviceId, "averagePriceToday", 10)
	]);
});

test("ElectricityPriceIntegration writes values to every device of the type", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	mockGetDevicesWithType.mockReturnValue([{ id: "a" }, { id: "b" }]);
	mockResponse([entry(new Date(2026, 10, 3, 12, 15), 0.1)]);

	await integration.update();

	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value("a", "currentPrice", 10),
		new Value("a", "averagePriceToday", 10),
		new Value("b", "currentPrice", 10),
		new Value("b", "averagePriceToday", 10)
	]);
});

test("ElectricityPriceIntegration throws on failed response", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	mockResponse([], false, 404);

	await expect(integration.update()).rejects.toThrow("status 404");
	expect(mockWrite).not.toHaveBeenCalled();
});

test("ElectricityPriceIntegration updates on schedule", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);
	const spy = vi
		.spyOn(integration, "update")
		.mockImplementation(() => Promise.resolve());

	await integration.start();

	const callback = mockSchedule.mock.calls[0]?.[1] as () => void;
	callback();

	expect(spy).toHaveBeenCalledTimes(2);
});

test("ElectricityPriceIntegration logs scheduled update failure", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);
	const spy = vi
		.spyOn(integration, "update")
		.mockResolvedValueOnce()
		.mockRejectedValueOnce(new Error("fail"));

	await integration.start();

	const callback = mockSchedule.mock.calls[0]?.[1] as () => void;
	callback();
	await vi.advanceTimersByTimeAsync(0);

	expect(spy).toHaveBeenCalledTimes(2);
});

test("ElectricityPriceIntegration stop stops the task", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	await integration.stop();
	expect(mockTaskStop).not.toHaveBeenCalled();

	integration.task = { stop: mockTaskStop } as never;
	await integration.stop();

	expect(mockTaskStop).toHaveBeenCalled();
});

test("Throws error when control is not implemented", async () => {
	const integration = new ElectricityPriceIntegration(services, settings);

	await expect(() =>
		integration.control("1", "2", new Value("1", "1", 1))
	).rejects.toThrow();
});
