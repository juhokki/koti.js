import { Router, type Request, type Response } from "express";
import type ServiceLocator from "../../../ServiceLocator.ts";
import {
	HTTP_BAD_REQUEST,
	HTTP_NO_CONTENT
} from "../../../../constants/Http.ts";

function parseItems(body: unknown): string[] | null {
	if (typeof body !== "object" || body === null) {
		return null;
	}

	const { items } = body as Record<string, unknown>;

	if (!Array.isArray(items) || items.length === 0) {
		return null;
	}

	const texts: string[] = [];

	for (const item of items as unknown[]) {
		if (typeof item !== "string" || item.trim() === "") {
			return null;
		}

		texts.push(item.trim());
	}

	return texts;
}

export default function (services: ServiceLocator) {
	const router = Router();

	router.patch("/shoppinglist", (req: Request, res: Response) => {
		const items = parseItems(req.body);

		if (!items) {
			res.status(HTTP_BAD_REQUEST).send("Invalid items.");
			return;
		}

		services.getShoppingListService().addItems(items);
		res.sendStatus(HTTP_NO_CONTENT);
	});

	return router;
}
