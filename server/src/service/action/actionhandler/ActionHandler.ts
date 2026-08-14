import type ScriptContext from "../ScriptContext.ts";

export default interface ActionHandler {
	matches: (deviceId: string, measurementId: string) => boolean;
	execute: (context: ScriptContext) => void;
}
