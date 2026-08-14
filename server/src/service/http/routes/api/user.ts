import { Router, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import {
	HTTP_INTERNAL_SERVER_ERROR,
	HTTP_OK
} from "../../../../constants/Http.ts";
import type { PutWebPushSubscriptionRequest } from "../../requests/PutWebPushSubscriptionRequest.ts";
import type { PostWebPushSubscriptionRequest } from "../../requests/PostWebPushSubscriptionRequest.ts";
import type { DeleteWebPushSubscriptionRequest } from "../../requests/DeleteWebPushSubscriptionRequest.ts";
import type { AuthenticatedRequest } from "../../requests/AuthenticatedRequest.ts";
import logger from "../../../../util/logger.ts";

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
