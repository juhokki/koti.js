import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DeleteIcon from "@mui/icons-material/Delete";
import RecipesApi from "../../api/RecipesApi";
import { Recipe } from "../../interface/Recipe";

export default function RecipeDelete() {
	const navigate = useNavigate();
	const { recipeId } = useParams();
	const [recipe, setRecipe] = useState<Recipe | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState(false);
	const [deleteError, setDeleteError] = useState(false);

	const go = (path: string) => {
		Promise.resolve(navigate(path)).catch(console.log);
	};

	useEffect(() => {
		if (!recipeId) {
			setLoading(false);
			setError(true);
			return;
		}

		RecipesApi.getRecipe(recipeId)
			.then((result) => {
				setRecipe(result);
				setLoading(false);
			})
			.catch(() => {
				setError(true);
				setLoading(false);
			});
	}, [recipeId]);

	const remove = () => {
		if (!recipe || deleting) {
			return;
		}

		setDeleting(true);
		setDeleteError(false);
		RecipesApi.deleteRecipe(recipe.id)
			.then(() => {
				go("/recipes");
			})
			.catch((e: unknown) => {
				console.log(e);
				setDeleteError(true);
				setDeleting(false);
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
								if (recipeId) {
									go(`/recipes/${recipeId}`);
								}
							}}
						/>
					</div>
					<div>
						<DeleteIcon />
						<span>Poista resepti</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="recipes">
					{loading && (
						<div className="loader-container">
							<div className="loader"></div>
						</div>
					)}
					{error && <p>Reseptiä ei löytynyt.</p>}
					{recipe && (
						<>
							<div className="recipe-box">
								<h3 className="centered underline">
									Vahvista poisto
								</h3>
								<p>
									Haluatko varmasti poistaa reseptin{" "}
									{recipe.title}?
								</p>
							</div>
							{deleteError && (
								<div className="message error">
									Reseptin poistaminen epäonnistui.
								</div>
							)}
							{deleting && (
								<div className="loader-container">
									<div className="loader"></div>
								</div>
							)}
							<div className="buttons">
								<button
									type="button"
									className="danger"
									disabled={deleting}
									onClick={remove}
								>
									<DeleteIcon />
									<span>Poista</span>
								</button>
								<button
									type="button"
									disabled={deleting}
									onClick={() => {
										go(`/recipes/${recipe.id}`);
									}}
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
