import { Router } from "express";
import getUserRouter from "./user.ts";
import getValuesRouter from "./values.ts";
import getSystemRouter from "./system.ts";
import type ServiceLocator from "../../../ServiceLocator.ts";

export default function (services: ServiceLocator) {
	const router = Router();

	router.use(getUserRouter(services));
	router.use(getValuesRouter(services));
	router.use(getSystemRouter(services));

	return router;
}
