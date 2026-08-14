import fetch from "node-fetch";
import IntegrationBase from "../IntegrationBase.js";
import Value from "../../../model/Value.js";
import type OpenWeatherIntegrationSettings from "./OpenWeatherIntegrationConfig.js";
import type ServiceLocator from "../../ServiceLocator.js";
import logger from "../../../util/logger.js";

export interface OpenWeatherMainResponse {
	temp: number;
	feels_like: number;
	humidity: number;
	pressure: number;
}

export interface OpenWeatherResponse {
	main: OpenWeatherMainResponse;
}

export default class OpenWeatherIntegration extends IntegrationBase {
	options: OpenWeatherIntegrationSettings;
	interval: NodeJS.Timeout | undefined;

	constructor(
		services: ServiceLocator,
		options: OpenWeatherIntegrationSettings
	) {
		super(services);

		this.options = options;
	}

	override async start() {
		this.interval = setInterval(() => {
			this.update().catch((e: unknown) => {
				logger.error(e, "Failed to fetch weather data.");
			});
		}, this.options.updateInterval);

		await this.update();
	}

	override stop() {
		if (this.interval) {
			clearInterval(this.interval);
		}

		return Promise.resolve();
	}

	async update() {
		const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.options.location}&units=metric&appid=${this.options.apiKey}`;
		const options = {
			method: "GET"
		};

		const response = await fetch(url, options);
		const data = (await response.json()) as OpenWeatherResponse;
		const values = [
			new Value(this.options.deviceId, "temperature", data.main.temp),
			new Value(
				this.options.deviceId,
				"temperature_feels_like",
				data.main.feels_like
			),
			new Value(this.options.deviceId, "humidity", data.main.humidity),
			new Value(
				this.options.deviceId,
				"pressure",
				Number((data.main.pressure * 0.1).toFixed(2))
			)
		];

		await this.services.getDataService().write(values);
	}
}
