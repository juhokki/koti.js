import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import { HTTP_INTERNAL_SERVER_ERROR } from "../../../../constants/Http.ts";
import logger from "../../../../util/logger.ts";

export default function (services: ServiceLocator) {
	const router = Router();
	const systemService = services.getSystemService();

	router.get("/system", async (req: Request, res: Response) => {
		try {
			const disk = await systemService.getDisk();
			res.send({ disk });
		} catch (e) {
			logger.error(e, "Failed to get system info.");
			res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
		}
	});

	return router;
}
