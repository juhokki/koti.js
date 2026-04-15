import { Router, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.js";
import RestApiIntegration from "../../../integration/rest/RestApiIntegration.js";
import {
	HTTP_INTERNAL_SERVER_ERROR,
	HTTP_OK
} from "../../../../constants/Http.js";
import type { PostValuesRequest } from "../../requests/PostValuesRequest.js";
import type { GetValueRangeRequest } from "../../requests/GetValueRangeRequest.js";
import type { PutValueRequest } from "../../requests/PutValueRequest.js";

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
			console.log("Failed to write values.", e);
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
			console.log("Failed to control value.", e);
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
				console.log("Failed to read values.", e);
				res.status(HTTP_INTERNAL_SERVER_ERROR).send(
					"Failed to read values."
				);
			}
		}
	);

	return router;
}
