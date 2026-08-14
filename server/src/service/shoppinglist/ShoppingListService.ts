import ServiceBase from "../ServiceBase.js";
import * as Messages from "../../constants/Messages.js";
import ShoppingList from "../../model/ShoppingList.js";
import ServiceLocator from "../ServiceLocator.js";
import type ShoppingListServiceSettings from "./ShoppingListServiceSettings.js";
import ShoppingListItem from "../../model/ShoppingListItem.js";
import type ShoppingListConfig from "./ShoppingListConfig.js";
import { readConfigFile, writeConfigFile } from "../../util/FileUtil.js";
import logger from "../../util/logger.js";

export default class ShoppingListService extends ServiceBase {
	options: ShoppingListServiceSettings;
	shoppingList: ShoppingList;
	shoppingListUpdateTimeoutId: NodeJS.Timeout | null;
	hasUpdates = false;

	constructor(
		services: ServiceLocator,
		options: ShoppingListServiceSettings
	) {
		super(services);

		this.options = options;
		this.shoppingList = this.readShoppingListFromFile();
		this.shoppingListUpdateTimeoutId = null;
	}

	override stop() {
		if (this.shoppingListUpdateTimeoutId) {
			clearTimeout(this.shoppingListUpdateTimeoutId);
		}

		this.writeShoppingListToFile();

		return Promise.resolve();
	}

	readShoppingListFromFile(): ShoppingList {
		const config = readConfigFile<ShoppingListConfig>(this.options.file);
		const shoppingList = new ShoppingList(
			config.update,
			config.items.map(
				(item) => new ShoppingListItem(item.id, item.text, item.crossed)
			)
		);

		return shoppingList;
	}

	getShoppingList(): ShoppingList {
		return this.shoppingList;
	}

	setShoppingList(shoppingList: ShoppingList) {
		const updateKey = this.shoppingList.update;

		if (shoppingList.update === updateKey) {
			shoppingList.update = Date.now().toString();
			this.shoppingList = shoppingList;
			this.hasUpdates = true;
			this.queueUpdate();
		} else {
			throw new Error("Invalid update key");
		}

		this.emit(Messages.SHOPPINGLIST, this.shoppingList);
	}

	queueUpdate() {
		if (this.shoppingListUpdateTimeoutId) {
			clearTimeout(this.shoppingListUpdateTimeoutId);
		}

		this.shoppingListUpdateTimeoutId = setTimeout(() => {
			this.writeShoppingListToFile();
		}, 60000);
	}

	writeShoppingListToFile() {
		if (!this.hasUpdates) {
			return;
		}

		try {
			const shoppingList = this.getShoppingList();
			const data = JSON.stringify(shoppingList, null, "\t");

			writeConfigFile(this.options.file, data);
			this.hasUpdates = false;

			logger.info("Wrote shopping list to file.");
		} catch (e) {
			logger.error(e, "Failed to synchronize shoppinglist");
		}
	}
}
