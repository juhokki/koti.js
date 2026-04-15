import type AlarmService from "./alarm/AlarmService.js";
import type AssetService from "./asset/AssetService.js";
import type DataService from "./data/DataService.js";
import type IntegrationService from "./integration/IntegrationService.js";
import type PushApiService from "./pushapi/PushApiService.js";
import type ServiceBase from "./ServiceBase.js";
import type ShoppingListService from "./shoppinglist/ShoppingListService.js";
import type SystemService from "./system/SystemService.js";
import type UserService from "./user/UserService.js";

export default class ServiceLocator {
	services: Map<string, ServiceBase>;

	constructor(services?: Map<string, ServiceBase>) {
		if (!services) {
			services = new Map<string, ServiceBase>();
		}

		this.services = services;
	}

	set(name: string, service: ServiceBase): void {
		this.services.set(name, service);
	}

	get(name: string): ServiceBase {
		const service: ServiceBase | undefined = this.services.get(name);

		if (!service) {
			throw new Error(`Service ${name} not found`);
		}

		return service;
	}

	values(): MapIterator<ServiceBase> {
		return this.services.values();
	}

	getAssetService(): AssetService {
		return this.get("AssetService") as AssetService;
	}

	getIntegrationService(): IntegrationService {
		return this.get("IntegrationService") as IntegrationService;
	}

	getDataService(): DataService {
		return this.get("DataService") as DataService;
	}

	getPushApiService(): PushApiService {
		return this.get("PushApiService") as PushApiService;
	}

	getAlarmService(): AlarmService {
		return this.get("AlarmService") as AlarmService;
	}

	getUserService(): UserService {
		return this.get("UserService") as UserService;
	}

	getShoppingListService(): ShoppingListService {
		return this.get("ShoppingListService") as ShoppingListService;
	}

	getSystemService(): SystemService {
		return this.get("SystemService") as SystemService;
	}
}
