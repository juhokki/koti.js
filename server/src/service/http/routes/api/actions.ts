import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import {
	HTTP_BAD_REQUEST,
	HTTP_NOT_FOUND
} from "../../../../constants/Http.ts";
import logger from "../../../../util/logger.ts";

export default function (services: ServiceLocator) {
	const router = Router();

	router.post("/actions/execute", (req: Request, res: Response) => {
		const { deviceId, measurementId, name, trigger } = (req.body ??
			{}) as Record<string, unknown>;

		if (
			typeof deviceId !== "string" ||
			typeof measurementId !== "string" ||
			typeof name !== "string" ||
			typeof trigger !== "string"
		) {
			res.sendStatus(HTTP_BAD_REQUEST);
			return;
		}

		try {
			const found = services
				.getActionService()
				.executeAction(deviceId, measurementId, name, trigger);

			if (!found) {
				res.sendStatus(HTTP_NOT_FOUND);
				return;
			}

			res.send({ ok: true });
		} catch (error) {
			logger.error(error, `Failed to execute action "${name}".`);
			res.send({
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	});

	return router;
}
