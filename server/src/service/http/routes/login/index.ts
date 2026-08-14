import { Router, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import { HTTP_UNAUTHORIZED } from "../../../../constants/Http.ts";
import type { PostLoginRequest } from "../../requests/PostLoginRequest.ts";
import logger from "../../../../util/logger.ts";

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
