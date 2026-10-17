import { Router } from "express";
import getUserRouter from "./user.ts";
import getValuesRouter from "./values.ts";
import getSystemRouter from "./system.ts";
import getLogsRouter from "./logs.ts";
import getRecipesRouter from "./recipes.ts";
import getShoppingListRouter from "./shoppinglist.ts";
import type ServiceLocator from "../../../ServiceLocator.ts";

export default function (services: ServiceLocator) {
	const router = Router();

	router.use(getUserRouter(services));
	router.use(getValuesRouter(services));
	router.use(getSystemRouter(services));
	router.use(getLogsRouter());
	router.use(getRecipesRouter(services));
	router.use(getShoppingListRouter(services));

	return router;
}
