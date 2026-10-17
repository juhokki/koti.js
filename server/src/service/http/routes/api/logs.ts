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

export default function () {
	const router = Router();

	router.get("/logs", (req: Request, res: Response) => {
		const start = parseInteger(req.query.start);
		const end = parseInteger(req.query.end);
		const level = req.query.level ?? "trace";

		if (
			start === undefined ||
			end === undefined ||
			end < start ||
			typeof level !== "string" ||
			!(level in LOG_LEVELS)
		) {
			res.sendStatus(HTTP_BAD_REQUEST);
			return;
		}

		try {
			const page = readLogs({
				start,
				end,
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
