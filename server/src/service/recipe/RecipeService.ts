import { randomUUID } from "crypto";
import ServiceBase from "../ServiceBase.ts";
import Recipe from "../../model/Recipe.ts";
import RecipeIngredient from "../../model/RecipeIngredient.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type RecipeServiceSettings from "./RecipeServiceSettings.ts";
import type RecipeConfig from "./RecipeConfig.ts";
import { readConfigFile, writeConfigFile } from "../../util/FileUtil.ts";
import logger from "../../util/logger.ts";

export type RecipeInput = Omit<Recipe, "id" | "owner">;

export default class RecipeService extends ServiceBase {
	options: RecipeServiceSettings;
	recipes: Recipe[];

	constructor(services: ServiceLocator, options: RecipeServiceSettings) {
		super(services);

		this.options = options;
		this.recipes = this.readRecipesFromFile();
	}

	readRecipesFromFile(): Recipe[] {
		const config = readConfigFile<RecipeConfig>(this.options.file);

		return config.recipes.map(
			(recipe) =>
				new Recipe(
					recipe.id,
					recipe.title,
					recipe.ingredients.map(
						(i) => new RecipeIngredient(i.amount, i.unit, i.name)
					),
					recipe.steps,
					recipe.owner
				)
		);
	}

	getAll(): Recipe[] {
		return this.recipes;
	}

	get(id: string): Recipe | undefined {
		return this.recipes.find((recipe) => recipe.id === id);
	}

	create(input: RecipeInput, owner: string): Recipe {
		const recipe = new Recipe(
			randomUUID(),
			input.title,
			input.ingredients,
			input.steps,
			owner
		);

		this.recipes.push(recipe);
		this.writeRecipesToFile();

		return recipe;
	}

	update(id: string, input: RecipeInput): Recipe | undefined {
		const index = this.recipes.findIndex((recipe) => recipe.id === id);

		if (index === -1) {
			return undefined;
		}
		const existing = this.recipes[index];

		if (!existing) {
			return undefined;
		}

		const recipe = new Recipe(
			id,
			input.title,
			input.ingredients,
			input.steps,
			existing.owner
		);

		this.recipes[index] = recipe;
		this.writeRecipesToFile();

		return recipe;
	}

	delete(id: string): boolean {
		const index = this.recipes.findIndex((recipe) => recipe.id === id);

		if (index === -1) {
			return false;
		}

		this.recipes.splice(index, 1);
		this.writeRecipesToFile();

		return true;
	}

	writeRecipesToFile() {
		const config: RecipeConfig = { recipes: this.recipes };

		writeConfigFile(this.options.file, JSON.stringify(config, null, "\t"));
		logger.info("Wrote recipes to file.");
	}
}
