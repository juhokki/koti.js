import type ActionConfig from "../../asset/ActionConfig.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import type ScriptContext from "../ScriptContext.ts";
import type ActionHandler from "./ActionHandler.ts";
import logger from "../../../util/logger.ts";

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
			logger.info(`Executing action "${this.name}".`);
			this.script.call(context);
		} catch (error) {
			logger.error(error, `Failed to execute action "${this.name}".`);
		}
	}
}
