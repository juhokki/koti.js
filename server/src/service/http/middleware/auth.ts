import type { NextFunction, Response } from "express";
import type ServiceLocator from "../../ServiceLocator.ts";
import { HTTP_UNAUTHORIZED } from "../../../constants/Http.ts";
import type { AuthenticatedRequest } from "../requests/AuthenticatedRequest.ts";
import logger from "../../../util/logger.ts";

export const AUTH_SCHEME_BASIC = "Basic";
export const AUTH_SCHEME_BEARER = "Bearer";

export default function createAuthMiddleware(services: ServiceLocator) {
	return (
		req: AuthenticatedRequest<
			object,
			object,
			object,
			object,
			Record<string, unknown>
		>,
		res: Response,
		next: NextFunction
	): void => {
		const authHeader = req.headers.authorization;

		if (!authHeader) {
			res.status(HTTP_UNAUTHORIZED).send("Missing authentication.");
			return;
		}

		const userService = services.getUserService();
		const [scheme, parameters] = authHeader.split(" ");

		if (scheme === AUTH_SCHEME_BASIC) {
			try {
				const credentials = parameters;

				if (!credentials) {
					throw new Error("Missing credentials");
				}

				const [username, password] = Buffer.from(credentials, "base64")
					.toString()
					.split(":");

				if (!username || !password) {
					throw new Error("Missing credentials");
				}

				req.user = userService.verifyBasic(username, password);
				next();
			} catch (error) {
				logger.error(error, "Basic authentication failed");
				res.sendStatus(HTTP_UNAUTHORIZED);
			}
		} else if (scheme === AUTH_SCHEME_BEARER) {
			try {
				const token = parameters;

				if (!token) {
					throw new Error("Missing Bearer token");
				}

				const user = userService.verifyJWT(token);
				req.user = user;
				next();
			} catch (e) {
				logger.error(e, "Bearer authentication failed");
				res.sendStatus(HTTP_UNAUTHORIZED);
			}
		} else {
			res.status(HTTP_UNAUTHORIZED).send(
				"Unsupported authentication scheme."
			);
		}
	};
}
