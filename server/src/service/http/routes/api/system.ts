import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import {
	HTTP_BAD_REQUEST,
	HTTP_INTERNAL_SERVER_ERROR,
	HTTP_NOT_FOUND
} from "../../../../constants/Http.ts";
import logger from "../../../../util/logger.ts";

export default function (services: ServiceLocator) {
	const router = Router();
	const systemService = services.getSystemService();

	router.get("/system", async (req: Request, res: Response) => {
		try {
			const integrationService = services.getIntegrationService();
			const disk = await systemService.getDisk();
			const uptime = systemService.getUptime();
			res.send({
				disk,
				uptime,
				integrations: integrationService.getEnabledIntegrations()
			});
		} catch (e) {
			logger.error(e, "Failed to get system info.");
			res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
		}
	});

	router.get("/system/integration", (req: Request, res: Response) => {
		const name = req.query.name;

		if (typeof name !== "string" || name === "") {
			res.sendStatus(HTTP_BAD_REQUEST);
			return;
		}

		const integrationService = services.getIntegrationService();

		if (!integrationService.getEnabledIntegrations().includes(name)) {
			res.sendStatus(HTTP_NOT_FOUND);
			return;
		}

		try {
			res.send({
				name,
				parameters: integrationService.getIntegrationParameters(name)
			});
		} catch (e) {
			logger.error(e, "Failed to get integration info.");
			res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
		}
	});

	return router;
}
