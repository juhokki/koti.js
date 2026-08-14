import { Router, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.js";
import { HTTP_UNAUTHORIZED } from "../../../../constants/Http.js";
import type { PostLoginRequest } from "../../requests/PostLoginRequest.js";
import logger from "../../../../util/logger.js";

export default function (services: ServiceLocator) {
	const router = Router();

	router.post("/", (req: PostLoginRequest, res: Response) => {
		try {
			const userService = services.getUserService();
			const token = userService.authenticate(
				req.body.username,
				req.body.password
			);
			res.send(token);
		} catch (error) {
			logger.error(error, "Failed to authenticate user");
			res.status(HTTP_UNAUTHORIZED);
		}
	});

	return router;
}
