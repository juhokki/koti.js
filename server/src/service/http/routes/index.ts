import express, { Router, type Request, type Response } from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import getLoginRouter from "./login/index.ts";
import getApiRouter from "./api/index.ts";
import getAuthMiddleware from "../middleware/auth.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import type HttpServiceSettings from "../HttpServiceSettings.ts";

export default function (
	services: ServiceLocator,
	options: HttpServiceSettings
) {
	const router = Router();
	const frontend = path.join(
		dirname(fileURLToPath(import.meta.url)),
		"../../../../..",
		options.frontend
	);

	router.use(compression());
	router.use(express.static(frontend));
	router.use(bodyParser.json());
	router.use(bodyParser.urlencoded({ extended: true }));
	router.use("/user/login", getLoginRouter(services));
	router.use("/api", getAuthMiddleware(services), getApiRouter(services));
	router.get(/(.*)/, (req: Request, res: Response) => {
		res.sendFile(path.join(frontend, "index.html"));
	});

	return router;
}
