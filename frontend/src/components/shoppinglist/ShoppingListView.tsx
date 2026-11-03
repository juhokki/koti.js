import { useState, useContext, useEffect, SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import update from "immutability-helper";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { ShoppingListContext } from "../../context/ShoppingListContext";
import { ShoppingList } from "../../interface/ShoppingList";

export default function ShoppingListView() {
	const navigate = useNavigate();
	const context = useContext(ShoppingListContext);
	const shoppingList = context.shoppingList;
	const [newItem, setNewItem] = useState("");
	const [hasCrossedItems, setHasCrossedItems] = useState(false);
	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};

	useEffect(() => {
		setHasCrossedItems(
			shoppingList
				? shoppingList.items.filter((item) => item.crossed).length > 0
				: false
		);
	}, [shoppingList?.items]);

	if (!shoppingList) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	const updateKey = shoppingList.update;
	const shoppingListItems = shoppingList.items;

	const updateShoppingList = (list: ShoppingList) => {
		context.setShoppingList(list, (e) => {
			if (e) {
				console.log("Failed to update shopping list.", e);
			}
		});
	};

	const addItem = (event: SubmitEvent) => {
		event.preventDefault();

		if (!newItem) {
			return;
		}

		const randomId = String(Date.now() + Math.round(Math.random() * 100));
		const item = {
			id: randomId,
			text: newItem,
			crossed: false
		};

		const updated = update(shoppingListItems, { $push: [item] });
		updateShoppingList({ update: updateKey, items: updated });
		setNewItem("");
	};

	const crossItem = (itemId: string) => {
		const index = shoppingListItems.findIndex((i) => i.id === itemId);

		if (typeof index !== "undefined" && index !== -1) {
			const updated = update(shoppingListItems, {
				[index]: {
					$apply: (item) => ({
						...item,
						crossed: !item.crossed
					})
				}
			});

			updateShoppingList({ update: updateKey, items: updated });
		}
	};

	const removeItem = (itemId: string) => {
		const index = shoppingListItems.findIndex((i) => i.id === itemId);

		if (typeof index !== "undefined" && index !== -1) {
			const updated = update(shoppingListItems, {
				$splice: [[index, 1]]
			});
			updateShoppingList({ update: updateKey, items: updated });
		}
	};

	const clear = (event: React.MouseEvent<HTMLButtonElement>) => {
		const items = shoppingListItems.filter((item) => {
			return !item.crossed;
		});

		updateShoppingList({ update: updateKey, items });
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
						<ShoppingCartIcon />
						<span>Ostoslista</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					{shoppingListItems.map((item) => (
						<div
							key={item.id}
							data-item-id={item.id}
							className="grid-item full-width clickable"
							onClick={() => { crossItem(item.id) }}
						>
							<span
								className={item.crossed ? "crossed" : ""}
							>
								{item.text}
							</span>
							<RemoveCircleIcon
								onClick={() => {
									removeItem(item.id);
								}}
								className="danger"
								style={{ float: "right" }}
							/>
						</div>
					))}
					<form className="full-width margin-top margin-left margin-right" onSubmit={addItem}>
						<input
							value={newItem}
							onChange={(e) => {
								setNewItem(e.target.value);
							}}
							type="text"
							placeholder="Lisää ostettava asia"
							className="full-width"
						/>
					</form>
					<div className="buttons">
						{hasCrossedItems && (
							<button
								onClick={clear}
								type="button"
								className="danger"
							>
								<DeleteIcon />
								<span>Poista ostetut</span>
							</button>
						)}
					</div>
				</div>
			</section>
		</section>
	);
}
