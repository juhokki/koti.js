import ServiceBase from "../ServiceBase.js";
import * as Messages from "../../constants/Messages.js";
import OnChangeActionHandler from "./actionhandler/OnChangeActionHandler.js";
import type ActionServiceSettings from "./ActionServiceSettings.js";
import type ServiceLocator from "../ServiceLocator.js";
import type Device from "../../model/Device.js";
import type ActionHandler from "./actionhandler/ActionHandler.js";
import type Value from "../../model/Value.js";
import ScriptContext from "./ScriptContext.js";

export default class ActionService extends ServiceBase {
	options: ActionServiceSettings;
	actionHandlers: ActionHandler[];
	context: ScriptContext;

	constructor(services: ServiceLocator, options: ActionServiceSettings) {
		super(services);

		this.options = options;
		this.actionHandlers = [];
		this.context = new ScriptContext(services);
	}

	override start() {
		this.parseActions(this.services.getAssetService().getDevices());

		this.services
			.getDataService()
			.on(
				Messages.VALUE_UPDATED,
				(deviceId: string, measurementId: string, value: Value) => {
					this.onValueUpdated(deviceId, measurementId, value);
				}
			);

		return Promise.resolve();
	}

	parseActions(devices: Device[]) {
		devices.forEach((device) => {
			device.measurements.forEach((measurement) => {
				measurement.actions.forEach((action) => {
					// TODO: Supports only one type of action handlers.
					this.actionHandlers.push(
						new OnChangeActionHandler(
							this.services,
							device.id,
							measurement.id,
							action
						)
					);
				});
			});
		});
	}

	getActions() {
		return this.actionHandlers;
	}

	onValueUpdated(deviceId: string, measurementId: string, value: Value) {
		this.actionHandlers.forEach((action) => {
			if (action.matches(deviceId, measurementId)) {
				action.execute(this.context);
			}
		});
	}
}
