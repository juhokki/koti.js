import React, { createContext, useState, useEffect } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";
import { STATUS_OK } from "../constants/HTTPStatus";
import { ShoppingList } from "../interface/ShoppingList";
import { HttpStatus } from "../interface/HttpStatus";

interface ShoppingListContextType {
	shoppingList: ShoppingList | null;
	setShoppingList: (
		shoppingList: ShoppingList,
		callback: (error?: Error) => void
	) => void;
}

const ShoppingListContext = createContext<ShoppingListContextType>(
	{} as ShoppingListContextType
);

const ShoppingListContextProvider: React.FC<{ children: React.ReactNode }> = ({
	children
}) => {
	const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);

	const setShoppingListInternal = (
		shoppingList: ShoppingList,
		callback: (error?: Error) => void
	) => {
		socket.emit(
			Messages.SHOPPINGLIST,
			shoppingList,
			(response: HttpStatus) => {
				if (response === STATUS_OK) {
					//setShoppingList(shoppingList);
					callback();
				} else {
					callback(new Error("Failed to update shopping list"));
				}
			}
		);
	};

	useEffect(() => {
		socket.on(Messages.SHOPPINGLIST, (shoppingList: ShoppingList) => {
			setShoppingList(shoppingList);
		});

		return () => {
			socket.off(Messages.SHOPPINGLIST);
		};
	});

	return (
		<ShoppingListContext.Provider
			value={{ shoppingList, setShoppingList: setShoppingListInternal }}
		>
			{children}
		</ShoppingListContext.Provider>
	);
};

export { ShoppingListContext, ShoppingListContextProvider };
