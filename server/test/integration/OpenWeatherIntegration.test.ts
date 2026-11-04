import { expect, vi, test, beforeEach } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Value from "../../src/model/Value.js";
import OpenWeatherIntegration from "../../src/service/integration/openweather/OpenWeatherIntegration.js";
import type OpenWeatherIntegrationSettings from "../../src/service/integration/openweather/OpenWeatherIntegrationConfig.js";
import type DataService from "../../src/service/data/DataService.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import DeviceType from "../../src/constants/DeviceType.js";

const mockFetch = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());
const mockGetDevicesWithType = vi.hoisted(() => vi.fn());

vi.mock("node-fetch", () => {
	return {
		default: mockFetch
	};
});

const services = new ServiceLocator(
	new Map<string, ServiceBase>([
		[
			"DataService",
			{
				write: mockWrite
			} as unknown as DataService
		],
		[
			"AssetService",
			{
				getDevicesWithType: mockGetDevicesWithType
			} as unknown as AssetService
		]
	])
);

const deviceId = "openweather";

const settings = {
	enabled: true,
	name: "OpenWeatherIntegration",
	updateInterval: 900000,
	apiKey: "test",
	location: "Vaasa,FI"
} satisfies OpenWeatherIntegrationSettings;

const now = Date.now();
vi.useFakeTimers();

beforeEach(() => {
	vi.setSystemTime(now);
	mockGetDevicesWithType.mockReturnValue([{ id: deviceId }]);
});

test("OpenWeatherIntegration is created", () => {
	const integration = new OpenWeatherIntegration(services, settings);

	expect(integration).not.toBe(null);
});

test("OpenWeatherIntegration updates on start", async () => {
	const response = {
		json: () => ({
			main: {
				temp: 10,
				feels_like: 8,
				humidity: 50,
				pressure: 1000
			}
		})
	};

	const integration = new OpenWeatherIntegration(services, settings);

	mockFetch.mockReturnValueOnce(Promise.resolve(response));

	await integration.start();

	expect(mockFetch).toHaveBeenCalled();
	expect(mockFetch).toHaveBeenLastCalledWith(
		`https://api.openweathermap.org/data/2.5/weather?q=${settings.location}&units=metric&appid=${settings.apiKey}`,
		{ method: "GET" }
	);

	expect(mockGetDevicesWithType).toHaveBeenCalledWith(
		DeviceType.OpenWeatherIntegration
	);
	expect(mockWrite).toHaveBeenCalled();
	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value(deviceId, "temperature", 10),
		new Value(deviceId, "temperature_feels_like", 8),
		new Value(deviceId, "humidity", 50),
		new Value(deviceId, "pressure", 100)
	]);
	expect(integration.getParameters()).toEqual([
		{ name: "Location", value: settings.location },
		{ name: "Last updated", value: new Date(now).toISOString() },
		{ name: "Update interval (minutes)", value: 15 }
	]);

	await integration.stop();
});

test("OpenWeatherIntegration writes values to every device of the type", async () => {
	const integration = new OpenWeatherIntegration(services, settings);

	mockGetDevicesWithType.mockReturnValue([{ id: "a" }, { id: "b" }]);
	mockFetch.mockReturnValueOnce(
		Promise.resolve({
			json: () => ({
				main: { temp: 1, feels_like: 2, humidity: 3, pressure: 1000 }
			})
		})
	);

	await integration.update();

	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value("a", "temperature", 1),
		new Value("a", "temperature_feels_like", 2),
		new Value("a", "humidity", 3),
		new Value("a", "pressure", 100),
		new Value("b", "temperature", 1),
		new Value("b", "temperature_feels_like", 2),
		new Value("b", "humidity", 3),
		new Value("b", "pressure", 100)
	]);
});

test("OpenWeatherIntegration updates on interval", async () => {
	const integration = new OpenWeatherIntegration(services, settings);

	const spy = vi
		.spyOn(integration, "update")
		.mockImplementation(() => Promise.resolve());

	await integration.start();

	expect(spy).toHaveBeenCalledTimes(1);

	vi.advanceTimersByTime(settings.updateInterval + 1);

	expect(spy).toHaveBeenCalledTimes(2);

	await integration.stop();
});

test("OpenWeatherIntegration stop clears interval", async () => {
	const integration = new OpenWeatherIntegration(services, settings);

	integration.interval = "test" as unknown as NodeJS.Timeout;

	const spy = vi.spyOn(global, "clearInterval");

	await integration.stop();

	expect(spy).toHaveBeenCalledWith("test");
});

test("Throws error when control is not implemented", async () => {
	const integration = new OpenWeatherIntegration(services, settings);

	await expect(() =>
		integration.control("1", "2", new Value("1", "1", 1))
	).rejects.toThrow();
});
