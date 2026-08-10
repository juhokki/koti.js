import Value from "../../model/Value.js";
import type ValueType from "../../types/ValueType.js";
import type ServiceLocator from "../ServiceLocator.js";

export default class ScriptContext {
	services: ServiceLocator;

	constructor(services: ServiceLocator) {
		this.services = services;
	}

	getValue(deviceId: string, measurementId: string) {
		return this.services
			.getDataService()
			.readLatestValue(deviceId, measurementId)?.value;
	}

	controlValue(deviceId: string, measurementId: string, value: ValueType) {
		return this.services
			.getDataService()
			.control(new Value(deviceId, measurementId, value));
	}

	sendPushNotification(title: string, message: string) {
		return this.services
			.getPushApiService()
			.sendToSubscribedUsers(title, message);
	}
}
