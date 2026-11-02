import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import RecipesApi from "../../api/RecipesApi";
import ShoppingListApi from "../../api/ShoppingListApi";
import { Recipe, RecipeIngredient } from "../../interface/Recipe";
import { UNITS } from "./RecipeEdit";

export default function RecipeShoppingList() {
	const navigate = useNavigate();
	const { recipeId } = useParams();
	const [recipe, setRecipe] = useState<Recipe | null>(null);
	const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [error, setError] = useState(false);
	const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

	const goBack = () => {
		Promise.resolve(navigate(`/recipes/${recipeId ?? ""}`)).catch(
			console.log
		);
	};
	const goToShoppingList = () => {
		Promise.resolve(navigate("/shoppinglist/")).catch(console.log);
	};

	useEffect(() => {
		if (!recipeId) {
			return;
		}

		RecipesApi.getRecipe(recipeId)
			.then((r) => {
				setRecipe(r);
				setIngredients(r.ingredients.map((i) => ({ ...i })));
				setSelected(new Set(r.ingredients.map((_, i) => i)));
			})
			.catch(() => {
				setError(true);
			});
	}, [recipeId]);

	const toggle = (index: number) => {
		setSelected((prev) => {
			const next = new Set(prev);

			if (!next.delete(index)) {
				next.add(index);
			}

			return next;
		});
	};

	const update = (
		index: number,
		field: keyof RecipeIngredient,
		value: string
	) => {
		setIngredients((prev) =>
			prev.map((ing, i) =>
				i === index ? { ...ing, [field]: value } : ing
			)
		);
	};

	const add = () => {
		if (!recipe) {
			return;
		}

		const items = ingredients
			.filter((_, i) => selected.has(i))
			.map((i) =>
				`${i.amount} ${i.unit} ${i.name}`.replace(/\s+/g, " ").trim()
			);

		setStatus("loading");
		ShoppingListApi.appendItems(items)
			.then(goToShoppingList)
			.catch((e: unknown) => {
				console.log(e);
				setStatus("error");
			});
	};

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={goBack}
						/>
					</div>
					<div>
						<AddShoppingCartIcon />
						<span>Lisää ostoslistaan</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<form className="grid"
							onSubmit={(e) => {
								e.preventDefault();
								add();
							}}>
					{error && <p>Reseptiä ei löytynyt.</p>}
					{!recipe && !error && (
						<div className="loader-container">
							<div className="loader"></div>
						</div>
					)}
					{recipe && (
						<>
							{status === "error" && (
								<div className="message error">
									Lisääminen epäonnistui.
								</div>
							)}
							<div className="grid-item full-width">
								{ingredients.map((ingredient, i) => (
									<div key={i} style={{ "display": "flex", "alignItems": "center", "padding": "var(--spacing)" }}>
										<Checkbox
											checked={selected.has(i)}
											onChange={() => {
												toggle(i);
											}}
											style={{ "marginRight": "var(--spacing)" }}
										/>
										<input
											type="text"
											aria-label="Määrä"
											value={ingredient.amount}
											onChange={(e) => {
												update(
													i,
													"amount",
													e.target.value
												);
											}}
											style={{ "marginRight": "var(--spacing)", "width": "80px" }}
										/>
										<Select
											size="small"
											displayEmpty
											inputProps={{
												"aria-label": "Yksikkö"
											}}
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
												update(
													i,
													"unit",
													e.target.value
												);
											}}
											style={{ "marginRight": "var(--spacing)", "width": "100px" }}
										>
											<MenuItem value="">-</MenuItem>
											{ingredient.unit &&
												!(
													UNITS as readonly string[]
												).includes(
													ingredient.unit
												) && (
													<MenuItem
														value={
															ingredient.unit
														}
													>
														{ingredient.unit}
													</MenuItem>
												)}
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
											aria-label="Nimi"
											value={ingredient.name}
											onChange={(e) => {
												update(
													i,
													"name",
													e.target.value
												);
											}}
											style={{ "flexGrow": 1 }}
										/>
									</div>
								))}
							</div>
							{status === "loading" && (
								<div className="loader-container">
									<div className="loader"></div>
								</div>
							)}
							<div className="buttons full-width">
								<button
									type="submit"
									disabled={
										selected.size === 0 ||
										status === "loading"
									}
								>
									<span>Lisää</span>
								</button>
							</div>
						</>
					)}
				</form>
			</section>
		</section>
	);
}
