import pino from "pino";
import { logBuffer } from "./LogBuffer.ts";

const level = process.env.LOG_LEVEL ?? "info";

export default pino(
	{ level },
	pino.multistream([
		{ level: "trace", stream: process.stdout },
		{ level: "trace", stream: logBuffer }
	])
);
