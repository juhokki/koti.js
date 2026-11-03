import type ActionConfig from "../../asset/ActionConfig.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import type ScriptContext from "../ScriptContext.ts";
import type ActionHandler from "./ActionHandler.ts";
import logger from "../../../util/logger.ts";
import type ActionTrigger from "../../../constants/ActionTrigger.ts";

export default class OnInitialValueActionHandler implements ActionHandler {
	services: ServiceLocator;
	deviceId: string;
	measurementId: string;
	name: string;
	trigger: string;
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
		this.trigger = action.trigger;
		this.script = new Function(action.script); // eslint-disable-line
	}

	matches(deviceId: string, measurementId: string, trigger: ActionTrigger) {
		return (
			this.deviceId === deviceId &&
			this.measurementId === measurementId &&
			this.trigger === trigger
		);
	}

	execute(context: ScriptContext) {
		logger.info(`Executing action "${this.name}".`);
		this.script.call(context);
	}
}
