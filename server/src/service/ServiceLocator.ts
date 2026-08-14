import type AlarmService from "./alarm/AlarmService.ts";
import type AssetService from "./asset/AssetService.ts";
import type DataService from "./data/DataService.ts";
import type IntegrationService from "./integration/IntegrationService.ts";
import type PushApiService from "./pushapi/PushApiService.ts";
import type ServiceBase from "./ServiceBase.ts";
import type ShoppingListService from "./shoppinglist/ShoppingListService.ts";
import type SystemService from "./system/SystemService.ts";
import type UserService from "./user/UserService.ts";

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
