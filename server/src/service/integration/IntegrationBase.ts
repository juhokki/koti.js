import type Value from "../../model/Value.ts";
import ServiceLocator from "../ServiceLocator.ts";
import type IntegrationParameter from "./IntegrationParameter.ts";

export default class IntegrationBase {
	services: ServiceLocator;

	constructor(services: ServiceLocator) {
		this.services = services;
	}

	start(): Promise<void> {
		return Promise.resolve();
	}

	stop(): Promise<void> {
		return Promise.resolve();
	}

	getParameters(): IntegrationParameter[] {
		return [];
	}

	control(
		deviceId: string,
		measurementId: string,
		value: Value
	): Promise<void> {
		return Promise.reject(
			new Error("Integration does not implement control method")
		);
	}
}
