import ServiceBase from "../ServiceBase.ts";
import * as Messages from "../../constants/Messages.ts";
import OnChangeActionHandler from "./actionhandler/OnChangeActionHandler.ts";
import type ActionServiceSettings from "./ActionServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type Device from "../../model/Device.ts";
import type ActionHandler from "./actionhandler/ActionHandler.ts";
import type Value from "../../model/Value.ts";
import ScriptContext from "./ScriptContext.ts";
import ActionTrigger from "../../constants/ActionTrigger.ts";
import logger from "../../util/logger.ts";
import OnInitialValueActionHandler from "./actionhandler/OnInitialValueActionHandler.ts";

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
				Messages.INITIAL_VALUE,
				(deviceId: string, measurementId: string, value: Value) => {
					this.executeMatchingActions(
						deviceId,
						measurementId,
						ActionTrigger.OnInitialValue
					);
				}
			)
			.on(
				Messages.VALUE_UPDATED,
				(deviceId: string, measurementId: string, value: Value) => {
					this.executeMatchingActions(
						deviceId,
						measurementId,
						ActionTrigger.OnChange
					);
				}
			);

		return Promise.resolve();
	}

	parseActions(devices: Device[]) {
		devices.forEach((device) => {
			device.measurements.forEach((measurement) => {
				measurement.actions.forEach((action) => {
					let handler: ActionHandler;

					switch (action.trigger) {
						case ActionTrigger.OnInitialValue:
							handler = new OnInitialValueActionHandler(
								this.services,
								device.id,
								measurement.id,
								action
							);
							break;
						case ActionTrigger.OnChange:
							handler = new OnChangeActionHandler(
								this.services,
								device.id,
								measurement.id,
								action
							);
							break;
						default:
							throw new Error(
								`Unsupported action trigger: ${String(action.trigger)}`
							);
					}

					this.actionHandlers.push(handler);
				});
			});
		});
	}

	getActions() {
		return this.actionHandlers;
	}

	executeMatchingActions(
		deviceId: string,
		measurementId: string,
		trigger: ActionTrigger
	) {
		this.actionHandlers.forEach((action) => {
			if (action.matches(deviceId, measurementId, trigger)) {
				try {
					action.execute(this.context);
				} catch (error) {
					logger.error(
						error,
						`Failed to execute action "${action.name}".`
					);
				}
			}
		});
	}

	/** Runs the action manually. Returns false if not found; script errors propagate. */
	executeAction(
		deviceId: string,
		measurementId: string,
		name: string,
		trigger: string
	) {
		const action = this.actionHandlers.find(
			(handler) =>
				handler.deviceId === deviceId &&
				handler.measurementId === measurementId &&
				handler.name === name &&
				handler.trigger === trigger
		);

		if (!action) {
			return false;
		}

		action.execute(this.context);

		return true;
	}
}
