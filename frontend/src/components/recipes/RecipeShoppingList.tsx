import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import Checkbox from "@mui/material/Checkbox";
import RecipesApi from "../../api/RecipesApi";
import ShoppingListApi from "../../api/ShoppingListApi";
import { Recipe } from "../../interface/Recipe";

export default function RecipeShoppingList() {
	const navigate = useNavigate();
	const { recipeId } = useParams();
	const [recipe, setRecipe] = useState<Recipe | null>(null);
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

	const add = () => {
		if (!recipe) {
			return;
		}

		const items = recipe.ingredients
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
				<div className="recipes">
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
							<div className="recipe-box">
								<ul className="ingredient-select">
									{recipe.ingredients.map((ingredient, i) => (
										<li key={i}>
											<label>
												<Checkbox
													checked={selected.has(i)}
													onChange={() => {
														toggle(i);
													}}
												/>
												<span>
													{`${ingredient.amount} ${ingredient.unit} ${ingredient.name}`}
												</span>
											</label>
										</li>
									))}
								</ul>
							</div>
							{status === "loading" && (
								<div className="loader-container">
									<div className="loader"></div>
								</div>
							)}
							<div className="buttons">
								<button
									type="button"
									disabled={
										selected.size === 0 ||
										status === "loading"
									}
									onClick={add}
								>
									<span>Lisää</span>
								</button>
								<button
									type="button"
									className="danger"
									onClick={goBack}
								>
									<span>Peruuta</span>
								</button>
							</div>
						</>
					)}
				</div>
			</section>
		</section>
	);
}
