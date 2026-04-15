import { Router } from "express";
import getUserRouter from "./user.js";
import getValuesRouter from "./values.js";
import getSystemRouter from "./system.js";
import type ServiceLocator from "../../../ServiceLocator.js";

export default function (services: ServiceLocator) {
	const router = Router();

	router.use(getUserRouter(services));
	router.use(getValuesRouter(services));
	router.use(getSystemRouter(services));

	return router;
}
