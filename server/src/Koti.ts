import path from "path";
import ServiceLocator from "./service/ServiceLocator.js";
import AssetService from "./service/asset/AssetService.js";
import ShoppingListService from "./service/shoppinglist/ShoppingListService.js";
import UserService from "./service/user/UserService.js";
import DataService from "./service/data/DataService.js";
import ActionService from "./service/action/ActionService.js";
import IntegrationService from "./service/integration/IntegrationService.js";
import AlarmService from "./service/alarm/AlarmService.js";
import SystemService from "./service/system/SystemService.js";
import PushApiService from "./service/pushapi/PushApiService.js";
import SchedulerService from "./service/scheduler/SchedulerService.js";
import HttpService from "./service/http/HttpService.js";
import type ServicesConfig from "./service/ServicesConfig.js";
import { readConfigFile } from "./util/FileUtil.js";

const SERVICES_CONFIG_FILE_NAME = "services.json";

export default class Koti {
	running = false;
	services: ServiceLocator;

	constructor(configDir: string) {
		const configPath = path.join(configDir, SERVICES_CONFIG_FILE_NAME);
		const config = readConfigFile<ServicesConfig>(configPath);

		this.services = this.buildServices(config);
	}

	buildServices(config: ServicesConfig): ServiceLocator {
		const services = new ServiceLocator();

		services.set(
			AssetService.name,
			new AssetService(services, config.AssetService)
		);
		services.set(
			DataService.name,
			new DataService(services, config.DataService)
		);
		services.set(
			ShoppingListService.name,
			new ShoppingListService(services, config.ShoppingListService)
		);
		services.set(
			UserService.name,
			new UserService(services, config.UserService)
		);
		services.set(
			AlarmService.name,
			new AlarmService(services, config.AlarmService)
		);
		services.set(
			ActionService.name,
			new ActionService(services, config.ActionService)
		);
		services.set(
			IntegrationService.name,
			new IntegrationService(services, config.IntegrationService)
		);
		services.set(
			SystemService.name,
			new SystemService(services, config.SystemService)
		);
		services.set(
			PushApiService.name,
			new PushApiService(services, config.PushApiService)
		);
		services.set(
			SchedulerService.name,
			new SchedulerService(services, config.SchedulerService)
		);
		services.set(
			HttpService.name,
			new HttpService(services, config.HttpService)
		);

		return services;
	}

	async start(): Promise<void> {
		console.log("Koti starting...");

		this.running = true;

		try {
			await this.startServices();
			console.log("Koti started and ready.");
		} catch (e) {
			console.log("Failed to start Koti.", e);
			throw e;
		}
	}

	async startServices(): Promise<void> {
		console.log("Starting services...");

		for (const service of this.services.values()) {
			try {
				console.log(`Starting service ${service.constructor.name}.`);
				await service.start();
			} catch (e) {
				console.log(
					`Failed to start service ${service.constructor.name}.`,
					e
				);
				throw e;
			}
		}

		console.log("All services started.");
	}

	async stop(): Promise<void> {
		if (this.running) {
			console.log("Stopping Koti...");

			this.running = false;
			await this.stopServices();

			console.log("Koti stopped.");
		}
	}

	async stopServices(): Promise<void> {
		console.log("Stopping services...");

		for (const service of this.services.values()) {
			try {
				console.log(`Stopping service ${service.constructor.name}.`);
				await service.stop();
			} catch (e) {
				console.log(
					`Failed to stop service ${service.constructor.name}.`,
					e
				);
			}
		}

		console.log("All services stopped.");
	}
}
