import EventEmitter from "events";
import ServiceLocator from "./ServiceLocator.ts";
import type ServiceParameter from "./ServiceParameter.ts";

export default class ServiceBase extends EventEmitter {
	services: ServiceLocator;

	constructor(services: ServiceLocator) {
		super();

		this.services = services;
	}

	start(): Promise<void> {
		return Promise.resolve();
	}

	stop(): Promise<void> {
		return Promise.resolve();
	}

	getParameters(): ServiceParameter[] {
		return [];
	}
}
