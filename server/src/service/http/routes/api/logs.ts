import { Router, type Request, type Response } from "express";
import {
	HTTP_BAD_REQUEST,
	HTTP_INTERNAL_SERVER_ERROR
} from "../../../../constants/Http.ts";
import logger from "../../../../util/logger.ts";
import {
	LOG_LEVELS,
	readLogs,
	type LogLevelName
} from "../../../../util/LogUtil.ts";

function parseInteger(value: unknown): number | undefined {
	if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
	return Number(value);
}

function parseLevels(value: unknown): number[] | undefined {
	const levels = Array.isArray(value) ? value : [value];
	if (
		!levels.every(
			(level): level is LogLevelName =>
				typeof level === "string" && level in LOG_LEVELS
		)
	) {
		return undefined;
	}
	return levels.map((level) => LOG_LEVELS[level]);
}

export default function () {
	const router = Router();

	router.get("/logs", (req: Request, res: Response) => {
		const start = parseInteger(req.query.start);
		const end = parseInteger(req.query.end);
		const levels = parseLevels(req.query.level ?? "trace");

		if (
			start === undefined ||
			end === undefined ||
			end < start ||
			levels === undefined
		) {
			res.sendStatus(HTTP_BAD_REQUEST);
			return;
		}

		try {
			const page = readLogs({
				start,
				end,
				levels
			});
			res.send(page);
		} catch (e) {
			logger.error(e, "Failed to read logs.");
			res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
		}
	});

	return router;
}
