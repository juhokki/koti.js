import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import RecipesApi from "../../api/RecipesApi";
import { Recipe } from "../../interface/Recipe";
import { UserContext } from "../../context/UserContext";

export default function RecipeDetails() {
	const navigate = useNavigate();
	const user = useContext(UserContext).user;
	const { recipeId } = useParams();
	const [recipe, setRecipe] = useState<Recipe | null>(null);
	const [error, setError] = useState(false);

	const go = (path: string) => {
		Promise.resolve(navigate(path)).catch(console.log);
	};

	useEffect(() => {
		if (!recipeId) {
			return;
		}

		RecipesApi.getRecipe(recipeId)
			.then(setRecipe)
			.catch(() => {
				setError(true);
			});
	}, [recipeId]);

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={() => {
								go("/recipes");
							}}
						/>
					</div>
					<div>
						<RestaurantMenuIcon />
						<span>{recipe ? recipe.title : "Resepti"}</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					{error && <p>Reseptiä ei löytynyt.</p>}
					{!recipe && !error && (
						<div className="loader-container">
							<div className="loader"></div>
						</div>
					)}
					{recipe && (
						<>
							<div className="grid-item full-width">
								<h3 className="centered underline">
									Ainesosat
								</h3>
								<ul>
									{recipe.ingredients.map((ingredient, i) => (
										<li key={i}>
											<span
												style={{
													marginRight:
														"var(--spacing)",
													display: "inline-block",
													width: "80px"
												}}
											>
												{ingredient.amount}{" "}
												{ingredient.unit}
											</span>
											{ingredient.name}
										</li>
									))}
								</ul>
							</div>
							<div className="grid-item full-width">
								<h3 className="centered underline">
									Valmistus
								</h3>
								<ol>
									{recipe.steps.map((step, i) => (
										<li key={i}>
											<span
												style={{
													marginRight:
														"var(--spacing)",
													display: "inline-block",
													width: "40px"
												}}
											>
												{`${(i + 1).toString()}.`}
											</span>
											{step}
										</li>
									))}
								</ol>
							</div>
							<div className="buttons full-width">
								<button
									type="button"
									onClick={() => {
										go(
											`/recipes/${recipe.id}/shoppinglist`
										);
									}}
								>
									<AddShoppingCartIcon />
									<span>Lisää ostoslistaan</span>
								</button>
								{user?.username === recipe.owner && (
									<>
										<button
											type="button"
											onClick={() => {
												go(
													`/recipes/${recipe.id}/edit`
												);
											}}
										>
											<EditIcon />
											<span>Muokkaa</span>
										</button>
										<button
											type="button"
											className="danger"
											onClick={() => {
												go(
													`/recipes/${recipe.id}/delete`
												);
											}}
										>
											<DeleteIcon />
											<span>Poista</span>
										</button>
									</>
								)}
							</div>
						</>
					)}
				</div>
			</section>
		</section>
	);
}
