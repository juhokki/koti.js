import { Router, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import RestApiIntegration from "../../../integration/rest/RestApiIntegration.ts";
import {
	HTTP_INTERNAL_SERVER_ERROR,
	HTTP_OK
} from "../../../../constants/Http.ts";
import type { PostValuesRequest } from "../../requests/PostValuesRequest.ts";
import type { GetValueRangeRequest } from "../../requests/GetValueRangeRequest.ts";
import type { PutValueRequest } from "../../requests/PutValueRequest.ts";
import logger from "../../../../util/logger.ts";

export default function (services: ServiceLocator) {
	const router = Router();
	const dataService = services.getDataService();

	router.post("/values", async (req: PostValuesRequest, res: Response) => {
		const values = req.body;

		try {
			const integration = services
				.getIntegrationService()
				.get<RestApiIntegration>(RestApiIntegration.name);
			await integration.write(values);
			res.sendStatus(HTTP_OK);
		} catch (e) {
			logger.error(e, "Failed to write values.");
			res.status(HTTP_INTERNAL_SERVER_ERROR).send(
				"Failed to write values."
			);
		}
	});

	router.put("/values", async (req: PutValueRequest, res: Response) => {
		const value = req.body;

		try {
			await dataService.control(value);
			res.sendStatus(HTTP_OK);
		} catch (e) {
			logger.error(e, "Failed to control value.");
			res.status(HTTP_INTERNAL_SERVER_ERROR).send(
				"Failed to control value."
			);
		}
	});

	router.get(
		"/values/:deviceId",
		async (req: GetValueRangeRequest, res: Response) => {
			const deviceId = req.params.deviceId;
			const startTime = parseInt(req.query.startTime, 10);
			const endTime = parseInt(req.query.endTime, 10);

			try {
				const data = await dataService.readDeviceValues(
					deviceId,
					startTime,
					endTime
				);
				res.send(data);
			} catch (e) {
				logger.error(e, "Failed to read values.");
				res.status(HTTP_INTERNAL_SERVER_ERROR).send(
					"Failed to read values."
				);
			}
		}
	);

	return router;
}
