import type { NextFunction, Response } from "express";
import type ServiceLocator from "../../ServiceLocator.js";
import { HTTP_UNAUTHORIZED } from "../../../constants/Http.js";
import type { AuthenticatedRequest } from "../requests/AuthenticatedRequest.js";

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
				console.log("Basic authentication failed", error);
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
				console.log("Bearer authentication failed", e);
				res.sendStatus(HTTP_UNAUTHORIZED);
			}
		} else {
			res.status(HTTP_UNAUTHORIZED).send(
				"Unsupported authentication scheme."
			);
		}
	};
}
