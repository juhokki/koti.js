import type ActionTrigger from "../constants/ActionTrigger.ts";

export default class Action {
	name: string;
	trigger: ActionTrigger;
	script: string;

	constructor(name: string, trigger: ActionTrigger, script: string) {
		this.name = name;
		this.trigger = trigger;
		this.script = script;
	}
}
