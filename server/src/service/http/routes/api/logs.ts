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

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function parseInteger(value: unknown, fallback: number): number | undefined {
	if (value === undefined) return fallback;
	if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
	return Number(value);
}

export default function () {
	const router = Router();

	router.get("/logs", (req: Request, res: Response) => {
		const start = parseInteger(req.query.start, 0);
		const limit = parseInteger(req.query.limit, DEFAULT_LIMIT);
		const level = req.query.level ?? "trace";

		if (
			start === undefined ||
			limit === undefined ||
			limit < 1 ||
			limit > MAX_LIMIT ||
			typeof level !== "string" ||
			!(level in LOG_LEVELS)
		) {
			res.sendStatus(HTTP_BAD_REQUEST);
			return;
		}

		try {
			const page = readLogs({
				start,
				limit,
				minLevel: LOG_LEVELS[level as LogLevelName]
			});
			res.send(page);
		} catch (e) {
			logger.error(e, "Failed to read logs.");
			res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
		}
	});

	return router;
}
