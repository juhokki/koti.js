import type ActionTrigger from "../../enums/ActionTrigger.js";

export default class ActionConfig {
	name: string;
	trigger: ActionTrigger;
	script: string;

	constructor(name: string, trigger: ActionTrigger, script: string) {
		this.name = name;
		this.trigger = trigger;
		this.script = script;
	}
}
