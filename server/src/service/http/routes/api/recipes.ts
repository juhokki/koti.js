import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import type { RecipeInput } from "../../../recipe/RecipeService.ts";
import {
	HTTP_BAD_REQUEST,
	HTTP_CREATED,
	HTTP_NO_CONTENT,
	HTTP_NOT_FOUND
} from "../../../../constants/Http.ts";

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

	router.get("/recipes/:id", (req: Request<{ id: string }>, res: Response) => {
		const recipe = recipeService.get(req.params.id);

		if (!recipe) {
			res.sendStatus(HTTP_NOT_FOUND);
			return;
		}

		res.json(recipe);
	});

	router.post("/recipes", (req: Request, res: Response) => {
		const input = parseRecipe(req.body);

		if (!input) {
			res.status(HTTP_BAD_REQUEST).send("Invalid recipe.");
			return;
		}

		res.status(HTTP_CREATED).json(recipeService.create(input));
	});

	router.put("/recipes/:id", (req: Request<{ id: string }>, res: Response) => {
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

	router.delete(
		"/recipes/:id",
		(req: Request<{ id: string }>, res: Response) => {
			if (!recipeService.delete(req.params.id)) {
				res.sendStatus(HTTP_NOT_FOUND);
				return;
			}

			res.sendStatus(HTTP_NO_CONTENT);
		}
	);

	return router;
}
