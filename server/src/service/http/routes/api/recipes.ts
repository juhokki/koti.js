import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import type { RecipeInput } from "../../../recipe/RecipeService.ts";
import type { AuthenticatedRequest } from "../../requests/AuthenticatedRequest.ts";
import {
	HTTP_BAD_REQUEST,
	HTTP_CREATED,
	HTTP_FORBIDDEN,
	HTTP_NO_CONTENT,
	HTTP_NOT_FOUND,
	HTTP_UNAUTHORIZED
} from "../../../../constants/Http.ts";

type RecipeBodyRequest = AuthenticatedRequest<
	object,
	object,
	unknown,
	object,
	Record<string, unknown>
>;
type RecipeIdBodyRequest = AuthenticatedRequest<
	{ id: string },
	object,
	unknown,
	object,
	Record<string, unknown>
>;

function isString(value: unknown): value is string {
	return typeof value === "string";
}

function parseRecipe(body: unknown): RecipeInput | null {
	if (typeof body !== "object" || body === null) {
		return null;
	}

	const { title, ingredients, steps } = body as Record<string, unknown>;

	if (!isString(title) || title.trim() === "") {
		return null;
	}

	if (!Array.isArray(ingredients) || !Array.isArray(steps)) {
		return null;
	}

	if (!steps.every(isString)) {
		return null;
	}

	const parsedIngredients = [];

	for (const ingredient of ingredients as unknown[]) {
		if (typeof ingredient !== "object" || ingredient === null) {
			return null;
		}

		const { amount, unit, name } = ingredient as Record<string, unknown>;

		if (
			!isString(amount) ||
			!isString(unit) ||
			!isString(name) ||
			name.trim() === ""
		) {
			return null;
		}

		parsedIngredients.push({ amount, unit, name });
	}

	return { title, ingredients: parsedIngredients, steps };
}

export default function (services: ServiceLocator) {
	const router = Router();
	const recipeService = services.getRecipeService();

	router.get("/recipes", (req: Request, res: Response) => {
		res.json(recipeService.getAll());
	});

	router.get(
		"/recipes/:id",
		(req: Request<{ id: string }>, res: Response) => {
			const recipe = recipeService.get(req.params.id);

			if (!recipe) {
				res.sendStatus(HTTP_NOT_FOUND);
				return;
			}

			res.json(recipe);
		}
	);

	router.post("/recipes", (req: RecipeBodyRequest, res: Response) => {
		const input = parseRecipe(req.body);

		if (!input) {
			res.status(HTTP_BAD_REQUEST).send("Invalid recipe.");
			return;
		}

		const owner = req.user?.username;

		if (!owner) {
			res.sendStatus(HTTP_UNAUTHORIZED);
			return;
		}

		res.status(HTTP_CREATED).json(recipeService.create(input, owner));
	});

	router.put("/recipes/:id", (req: RecipeIdBodyRequest, res: Response) => {
		const existing = recipeService.get(req.params.id);

		if (!existing) {
			res.sendStatus(HTTP_NOT_FOUND);
			return;
		}

		if (existing.owner !== req.user?.username) {
			res.sendStatus(HTTP_FORBIDDEN);
			return;
		}

		const input = parseRecipe(req.body);

		if (!input) {
			res.status(HTTP_BAD_REQUEST).send("Invalid recipe.");
			return;
		}

		const recipe = recipeService.update(req.params.id, input);

		if (!recipe) {
			res.sendStatus(HTTP_NOT_FOUND);
			return;
		}

		res.json(recipe);
	});

	router.delete("/recipes/:id", (req: RecipeIdBodyRequest, res: Response) => {
		const existing = recipeService.get(req.params.id);

		if (!existing) {
			res.sendStatus(HTTP_NOT_FOUND);
			return;
		}

		if (existing.owner !== req.user?.username) {
			res.sendStatus(HTTP_FORBIDDEN);
			return;
		}

		if (!recipeService.delete(req.params.id)) {
			res.sendStatus(HTTP_NOT_FOUND);
			return;
		}

		res.sendStatus(HTTP_NO_CONTENT);
	});

	return router;
}
