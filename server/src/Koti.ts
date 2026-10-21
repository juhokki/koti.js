import path from "path";
import logger from "./util/logger.ts";
import ServiceLocator from "./service/ServiceLocator.ts";
import AssetService from "./service/asset/AssetService.ts";
import ShoppingListService from "./service/shoppinglist/ShoppingListService.ts";
import RecipeService from "./service/recipe/RecipeService.ts";
import UserService from "./service/user/UserService.ts";
import DataService from "./service/data/DataService.ts";
import ActionService from "./service/action/ActionService.ts";
import IntegrationService from "./service/integration/IntegrationService.ts";
import AlarmService from "./service/alarm/AlarmService.ts";
import SystemService from "./service/system/SystemService.ts";
import PushApiService from "./service/pushapi/PushApiService.ts";
import SchedulerService from "./service/scheduler/SchedulerService.ts";
import HttpService from "./service/http/HttpService.ts";
import type ServicesConfig from "./service/ServicesConfig.ts";
import { readConfigFile } from "./util/FileUtil.ts";

const SERVICES_CONFIG_FILE_NAME = "services.json";

export default class Koti {
	running = false;
	services: ServiceLocator;

	constructor(configDir: string) {
		const configPath = path.join(configDir, SERVICES_CONFIG_FILE_NAME);
		const config = readConfigFile<ServicesConfig>(configPath);

		this.redirectConsole();
		this.services = this.buildServices(config);
	}

	// Ensures console output from dependencies is redirected to the logger
	redirectConsole() {
		/* eslint-disable no-console */
		console.debug = (...args: Parameters<typeof logger.debug>) => { logger.debug(...args); };
		console.log = console.info = (...args: Parameters<typeof logger.info>) => { logger.info(...args); };
		console.warn = (...args: Parameters<typeof logger.warn>) => { logger.warn(...args); };
		console.error = (...args: Parameters<typeof logger.error>) => { logger.error(...args); };
		/* eslint-enable no-console */
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
			RecipeService.name,
			new RecipeService(services, config.RecipeService)
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
		logger.info("Koti starting...");

		this.running = true;

		try {
			await this.startServices();
			logger.info("Koti started and ready.");
		} catch (e) {
			logger.error(e, "Failed to start Koti.");
			throw e;
		}
	}

	async startServices(): Promise<void> {
		logger.info("Starting services...");

		for (const service of this.services.values()) {
			try {
				logger.info(`Starting service ${service.constructor.name}.`);
				await service.start();
			} catch (e) {
				logger.error(
					e,
					`Failed to start service ${service.constructor.name}.`
				);
				throw e;
			}
		}

		logger.info("All services started.");
	}

	async stop(): Promise<void> {
		if (this.running) {
			logger.info("Stopping Koti...");

			this.running = false;
			await this.stopServices();

			logger.info("Koti stopped.");
		}
	}

	async stopServices(): Promise<void> {
		logger.info("Stopping services...");

		for (const service of this.services.values()) {
			try {
				logger.info(`Stopping service ${service.constructor.name}.`);
				await service.stop();
			} catch (e) {
				logger.error(
					e,
					`Failed to stop service ${service.constructor.name}.`
				);
			}
		}

		logger.info("All services stopped.");
	}
}
