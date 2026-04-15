import EventEmitter from "events";
import ServiceLocator from "./ServiceLocator.js";

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
}
