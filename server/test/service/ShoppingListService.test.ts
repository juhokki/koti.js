import { expect, vi, test, beforeEach } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import * as Messages from "../../src/constants/Messages.js";
import ShoppingListService from "../../src/service/shoppinglist/ShoppingListService.js";
import type ShoppingListServiceSettings from "../../src/service/shoppinglist/ShoppingListServiceSettings.js";
import type ShoppingList from "../../src/model/ShoppingList.js";

const now = Date.now();
vi.useFakeTimers();
vi.spyOn(global, "setTimeout");

const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
	writeFileSync: mockWriteFileSync,
	readFileSync: mockReadFileSync
}));

const services = new ServiceLocator();

const settings = {
	file: "shoppinglist.json"
} satisfies ShoppingListServiceSettings;

beforeEach(() => {
	vi.setSystemTime(now);
});

test("ShoppingListService is created", () => {
	const shoppingList = {
		update: "1",
		items: []
	} satisfies ShoppingList;

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(shoppingList));

	const service = new ShoppingListService(services, settings);

	expect(service).not.toBe(null);
});

test("Shopping list is updated", async (done) => {
	const shoppingList = {
		update: "1",
		items: [
			{
				id: "1",
				text: "item-1",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(shoppingList));

	const service = new ShoppingListService(services, settings);

	await service.start();

	expect(service.getShoppingList()).toStrictEqual(
		expect.objectContaining({
			update: "1",
			items: [expect.objectContaining({ id: "1" })]
		})
	);

	const newShoppingList = {
		update: "1",
		items: [
			{
				id: "1",
				text: "item-1",
				crossed: false
			},
			{
				id: "2",
				text: "item-2",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	const mockEmitShoppingList = vi.fn();

	service.on(Messages.SHOPPINGLIST, mockEmitShoppingList);

	service.setShoppingList(newShoppingList);

	expect(mockEmitShoppingList).toHaveBeenCalledWith(
		expect.objectContaining({
			update: String(now),
			items: [
				expect.objectContaining({ id: "1" }),
				expect.objectContaining({ id: "2" })
			]
		})
	);

	await service.stop();
});

test("Shopping list is not updated with wrong update key", async () => {
	const shoppingList = {
		update: "1",
		items: [
			{
				id: "1",
				text: "item-1",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(shoppingList));

	const service = new ShoppingListService(services, settings);

	await service.start();

	expect(service.getShoppingList()).toStrictEqual(
		expect.objectContaining({
			update: "1",
			items: [expect.objectContaining({ id: "1" })]
		})
	);

	const newShoppingList = {
		update: "wrong",
		items: []
	} satisfies ShoppingList;

	expect(() => {
		service.setShoppingList(newShoppingList);
	}).toThrow();

	await service.stop();
});

test("Shopping list file is written to file after a timeout", async () => {
	const shoppingList = {
		update: "1",
		items: [
			{
				id: "1",
				text: "item-1",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(shoppingList));

	const service = new ShoppingListService(services, settings);

	await service.start();

	const newShoppingList = {
		update: "1",
		items: [
			{
				id: "2",
				text: "item-2",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	service.setShoppingList(newShoppingList);

	vi.advanceTimersByTime(60001);

	expect(setTimeout).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenLastCalledWith(
		settings.file,
		JSON.stringify(newShoppingList, null, "\t")
	);

	await service.stop();
});

test("Stopping ShoppingListService updates file", async () => {
	const shoppingList = {
		update: "1",
		items: [
			{
				id: "1",
				text: "item-1",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(shoppingList));

	const service = new ShoppingListService(services, settings);

	await service.start();

	const newShoppingList = {
		update: "1",
		items: [
			{
				id: "2",
				text: "item-2",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	service.setShoppingList(newShoppingList);

	await service.stop();

	expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenLastCalledWith(
		settings.file,
		JSON.stringify(newShoppingList, null, "\t")
	);
});

test("Shopping list file is written only once", async () => {
	const shoppingList = {
		update: "1",
		items: [
			{
				id: "1",
				text: "item-1",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	mockReadFileSync.mockReturnValueOnce(JSON.stringify(shoppingList));

	const service = new ShoppingListService(services, settings);

	await service.start();

	const newShoppingList = {
		update: "1",
		items: [
			{
				id: "2",
				text: "item-2",
				crossed: false
			}
		]
	} satisfies ShoppingList;

	service.setShoppingList(newShoppingList);
	vi.advanceTimersByTime(30000);

	const newShoppingList2 = {
		update: service.shoppingList.update,
		items: [
			{
				id: "3",
				text: "item-3",
				crossed: false
			}
		]
	};

	service.setShoppingList(newShoppingList2);
	vi.advanceTimersByTime(60001);

	expect(setTimeout).toHaveBeenCalledTimes(2);
	expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenLastCalledWith(
		settings.file,
		JSON.stringify(newShoppingList2, null, "\t")
	);

	await service.stop();
});
