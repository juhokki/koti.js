import { expect, vi, test, beforeEach } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Value from "../../src/model/Value.js";
import OpenWeatherIntegration from "../../src/service/integration/openweather/OpenWeatherIntegration.js";
import type OpenWeatherIntegrationSettings from "../../src/service/integration/openweather/OpenWeatherIntegrationConfig.js";
import type DataService from "../../src/service/data/DataService.js";

const mockFetch = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());

vi.mock("node-fetch", () => {
	return {
		default: mockFetch
	};
});

const services = new ServiceLocator(
	new Map([
		[
			"DataService",
			{
				write: mockWrite
			} as unknown as DataService
		]
	])
);

const settings = {
	enabled: true,
	name: "OpenWeatherIntegration",
	deviceId: "openweather",
	updateInterval: 900000,
	apiKey: "test",
	location: "Vaasa,FI"
} satisfies OpenWeatherIntegrationSettings;

const now = Date.now();
vi.useFakeTimers();

beforeEach(() => {
	vi.setSystemTime(now);
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

	expect(mockWrite).toHaveBeenCalled();
	expect(mockWrite).toHaveBeenLastCalledWith([
		new Value(settings.deviceId, "temperature", 10),
		new Value(settings.deviceId, "temperature_feels_like", 8),
		new Value(settings.deviceId, "humidity", 50),
		new Value(settings.deviceId, "pressure", 100)
	]);

	await integration.stop();
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
