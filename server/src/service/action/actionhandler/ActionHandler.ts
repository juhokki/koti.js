import type ScriptContext from "../ScriptContext.js";

export default interface ActionHandler {
	matches: (deviceId: string, measurementId: string) => boolean;
	execute: (context: ScriptContext) => void;
}
