import type ActionTrigger from "../../../constants/ActionTrigger.ts";
import type ScriptContext from "../ScriptContext.ts";

export default interface ActionHandler {
	matches: (deviceId: string, measurementId: string, trigger: ActionTrigger) => boolean;
	execute: (context: ScriptContext) => void;
}
