import pino from "pino";
import { logBuffer } from "./LogBuffer.ts";

export default pino(
	{ level: "trace" },
	pino.multistream([
		{ level: process.env.LOG_LEVEL ?? "info", stream: process.stdout },
		{ level: "trace", stream: logBuffer }
	])
);
