import type ActionConfig from "../../asset/ActionConfig.js";
import type ServiceLocator from "../../ServiceLocator.js";
import type ScriptContext from "../ScriptContext.js";
import type ActionHandler from "./ActionHandler.js";

export default class OnChangeActionHandler implements ActionHandler {
	services: ServiceLocator;
	deviceId: string;
	measurementId: string;
	name: string;
	script: Function; // eslint-disable-line

	constructor(
		services: ServiceLocator,
		deviceId: string,
		measurementId: string,
		action: ActionConfig
	) {
		this.services = services;
		this.deviceId = deviceId;
		this.measurementId = measurementId;
		this.name = action.name;
		this.script = new Function(action.script); // eslint-disable-line
	}

	matches(deviceId: string, measurementId: string) {
		return (
			this.deviceId === deviceId && this.measurementId === measurementId
		);
	}

	execute(context: ScriptContext) {
		try {
			console.log(`Executing action "${this.name}".`);
			this.script.call(context);
		} catch (error) {
			console.log(`Failed to execute action "${this.name}".`, error);
		}
	}
}
