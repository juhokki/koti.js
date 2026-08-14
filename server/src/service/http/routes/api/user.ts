import { Router, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.js";
import {
	HTTP_INTERNAL_SERVER_ERROR,
	HTTP_OK
} from "../../../../constants/Http.js";
import type { PutWebPushSubscriptionRequest } from "../../requests/PutWebPushSubscriptionRequest.js";
import type { PostWebPushSubscriptionRequest } from "../../requests/PostWebPushSubscriptionRequest.js";
import type { DeleteWebPushSubscriptionRequest } from "../../requests/DeleteWebPushSubscriptionRequest.js";
import type { AuthenticatedRequest } from "../../requests/AuthenticatedRequest.js";
import logger from "../../../../util/logger.js";

export function getUser(
	req: AuthenticatedRequest<
		object,
		object,
		object,
		object,
		Record<string, unknown>
	>
) {
	if (!req.user) {
		throw new Error();
	}

	return req.user;
}

export default function (services: ServiceLocator) {
	const router = Router();
	const userService = services.getUserService();

	router.put(
		"/user/web-push",
		(req: PutWebPushSubscriptionRequest, res: Response) => {
			try {
				const user = getUser(req);
				const subscription = req.body;
				const isSubcribed = userService.getUserSubscriptionStatus(
					user.username,
					subscription
				);
				res.send({ status: isSubcribed });
			} catch (e) {
				logger.error(e, "Failed to get subscription.");
				res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
			}
		}
	);

	router.post(
		"/user/web-push",
		(req: PostWebPushSubscriptionRequest, res: Response) => {
			try {
				const user = getUser(req);
				const subscription = req.body;
				userService.addUserSubscription(user.username, subscription);
				res.sendStatus(HTTP_OK);
			} catch (e) {
				logger.error(e, "Failed to add subscription.");
				res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
			}
		}
	);

	router.delete(
		"/user/web-push",
		(req: DeleteWebPushSubscriptionRequest, res: Response) => {
			try {
				const user = getUser(req);
				const subscription = req.body;
				userService.deleteUserSubscription(user.username, subscription);
				res.sendStatus(HTTP_OK);
			} catch (e) {
				logger.error(e, "Failed to delete subscription.");
				res.sendStatus(HTTP_INTERNAL_SERVER_ERROR);
			}
		}
	);

	return router;
}
