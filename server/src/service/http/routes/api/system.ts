import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "../../../../constants/Http.js";
import logger from "../../../../util/logger.js";

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
