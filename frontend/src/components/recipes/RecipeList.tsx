import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import AddIcon from "@mui/icons-material/Add";
import RecipesApi from "../../api/RecipesApi";
import { Recipe } from "../../interface/Recipe";

export default function RecipeList() {
	const navigate = useNavigate();
	const [recipes, setRecipes] = useState<Recipe[] | null>(null);
	const [error, setError] = useState(false);

	const go = (path: string) => {
		Promise.resolve(navigate(path)).catch(console.log);
	};

	useEffect(() => {
		RecipesApi.getRecipes()
			.then(setRecipes)
			.catch(() => {
				setError(true);
			});
	}, []);

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={() => {
								go("/");
							}}
						/>
					</div>
					<div>
						<RestaurantMenuIcon />
						<span>Reseptit</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="recipes">
					{error && <p>Reseptien haku epäonnistui.</p>}
					{!recipes && !error && (
						<div className="loader-container">
							<div className="loader"></div>
						</div>
					)}
					{recipes && (
						<ul className="recipe-list">
							{recipes.map((recipe) => (
								<li
									key={recipe.id}
									className="recipe-item clickable"
									onClick={() => {
										go(`/recipes/${recipe.id}`);
									}}
								>
									{recipe.title}
								</li>
							))}
						</ul>
					)}
					<div className="buttons">
						<button
							type="button"
							onClick={() => {
								go("/recipes/new");
							}}
						>
							<AddIcon />
							<span>Uusi resepti</span>
						</button>
					</div>
				</div>
			</section>
		</section>
	);
}
