import { SubmitEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import SaveIcon from "@mui/icons-material/Save";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import RecipesApi from "../../api/RecipesApi";
import { RecipeIngredient } from "../../interface/Recipe";

const UNITS = ["g", "kg", "dl", "l", "tl", "rkl", "%", "kpl", "prk"] as const;
const DEFAULT_UNIT: string = UNITS[0];

interface IngredientDraft {
	amount: string;
	unit: string;
	name: string;
}

const emptyIngredient: IngredientDraft = {
	amount: "",
	unit: DEFAULT_UNIT,
	name: ""
};

export default function RecipeEdit() {
	const navigate = useNavigate();
	const { recipeId } = useParams();
	const [title, setTitle] = useState("");
	const [ingredients, setIngredients] = useState<IngredientDraft[]>([
		emptyIngredient
	]);
	const [steps, setSteps] = useState<string[]>([""]);
	const [loading, setLoading] = useState(Boolean(recipeId));
	const [error, setError] = useState(false);

	const go = (path: string) => {
		Promise.resolve(navigate(path)).catch(console.log);
	};

	useEffect(() => {
		if (!recipeId) {
			return;
		}

		RecipesApi.getRecipe(recipeId)
			.then((recipe) => {
				setTitle(recipe.title);
				setIngredients(
					recipe.ingredients.length > 0
						? recipe.ingredients.map((i) => ({
								amount: i.amount,
								unit: i.unit || DEFAULT_UNIT,
								name: i.name
							}))
						: [emptyIngredient]
				);
				setSteps(recipe.steps.length > 0 ? recipe.steps : [""]);
				setLoading(false);
			})
			.catch(() => {
				setError(true);
				setLoading(false);
			});
	}, [recipeId]);

	const updateIngredient = (
		index: number,
		field: keyof IngredientDraft,
		value: string
	) => {
		setIngredients(
			ingredients.map((item, i) =>
				i === index ? { ...item, [field]: value } : item
			)
		);
	};

	const save = (event: SubmitEvent) => {
		event.preventDefault();

		const parsedIngredients: RecipeIngredient[] = ingredients
			.filter((i) => i.name.trim() !== "")
			.map((i) => ({
				amount: i.amount.trim(),
				unit: i.unit.trim(),
				name: i.name.trim()
			}));
		const recipe = {
			title: title.trim(),
			ingredients: parsedIngredients,
			steps: steps.map((s) => s.trim()).filter((s) => s !== "")
		};
		const request = recipeId
			? RecipesApi.updateRecipe(recipeId, recipe)
			: RecipesApi.createRecipe(recipe);

		request
			.then((saved) => {
				go(`/recipes/${saved.id}`);
			})
			.catch(() => {
				setError(true);
			});
	};

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={() => {
								go(
									recipeId
										? `/recipes/${recipeId}`
										: "/recipes"
								);
							}}
						/>
					</div>
					<div>
						<RestaurantMenuIcon />
						<span>
							{recipeId ? "Muokkaa reseptiä" : "Uusi resepti"}
						</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="recipes">
					{loading ? (
						<div className="loader-container">
							<div className="loader"></div>
						</div>
					) : (
						<form onSubmit={save}>
							{error && (
								<div className="message error">
									Tallennus epäonnistui.
								</div>
							)}
							<input
								type="text"
								className="recipe-title"
								placeholder="Reseptin nimi"
								value={title}
								required
								onChange={(e) => {
									setTitle(e.target.value);
								}}
							/>
							<div className="recipe-box">
								<h3>Ainesosat</h3>
								{ingredients.map((ingredient, i) => (
									<div key={i} className="row ingredient-row">
										<input
											type="text"
											placeholder="Määrä"
											value={ingredient.amount}
											onChange={(e) => {
												updateIngredient(
													i,
													"amount",
													e.target.value
												);
											}}
										/>
										<Select
											className="unit-select"
											size="small"
											value={ingredient.unit}
											sx={{
												"& .MuiSelect-select": {
													margin: 0,
													minWidth: 0,
													backgroundColor:
														"#fff !important",
													color: "#000 !important"
												},
												"& .MuiSelect-icon": {
													color: "#000"
												}
											}}
											onChange={(e) => {
												updateIngredient(
													i,
													"unit",
													e.target.value
												);
											}}
										>
											{UNITS.map((unit) => (
												<MenuItem
													key={unit}
													value={unit}
												>
													{unit}
												</MenuItem>
											))}
										</Select>
										<input
											type="text"
											placeholder="Ainesosa"
											value={ingredient.name}
											onChange={(e) => {
												updateIngredient(
													i,
													"name",
													e.target.value
												);
											}}
										/>
										<RemoveCircleIcon
											className="danger clickable"
											onClick={() => {
												setIngredients(
													ingredients.filter(
														(_, j) => j !== i
													)
												);
											}}
										/>
									</div>
								))}
								<button
									type="button"
									onClick={() => {
										setIngredients([
											...ingredients,
											emptyIngredient
										]);
									}}
								>
									<AddIcon />
									<span>Lisää ainesosa</span>
								</button>
							</div>
							<div className="recipe-box">
								<h3>Valmistus</h3>
								{steps.map((step, i) => (
									<div key={i} className="row">
										<input
											type="text"
											placeholder="Vaihe"
											value={step}
											onChange={(e) => {
												setSteps(
													steps.map((s, j) =>
														j === i
															? e.target.value
															: s
													)
												);
											}}
										/>
										<RemoveCircleIcon
											className="danger clickable"
											onClick={() => {
												setSteps(
													steps.filter(
														(_, j) => j !== i
													)
												);
											}}
										/>
									</div>
								))}
								<button
									type="button"
									onClick={() => {
										setSteps([...steps, ""]);
									}}
								>
									<AddIcon />
									<span>Lisää vaihe</span>
								</button>
							</div>
							<div className="buttons">
								<button type="submit">
									<SaveIcon />
									<span>Tallenna</span>
								</button>
							</div>
						</form>
					)}
				</div>
			</section>
		</section>
	);
}
