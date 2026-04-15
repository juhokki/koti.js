import type { Server, Socket } from "socket.io";
import { expect, test, vi } from "vitest";
import * as Messages from "../../src/constants/Messages.js";
import type AlarmService from "../../src/service/alarm/AlarmService.js";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";
import HttpService from "../../src/service/http/HttpService.js";
import type HttpServiceSettings from "../../src/service/http/HttpServiceSettings.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import type ShoppingListService from "../../src/service/shoppinglist/ShoppingListService.js";
import type UserService from "../../src/service/user/UserService.js";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockServerListen = vi.hoisted(() => vi.fn());
const mockServerClose = vi.hoisted(() => vi.fn());
const mockSocketsClose = vi.hoisted(() => vi.fn());

vi.mock("express", () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const mockExpress = vi.fn().mockImplementation(() => ({
		use: vi.fn()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	})) as any;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	mockExpress.static = vi.fn() as unknown;

	return {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		default: mockExpress,
		Router: vi.fn().mockImplementation(() => ({
			use: vi.fn(),
			get: vi.fn(),
			put: vi.fn(),
			post: vi.fn(),
			delete: vi.fn()
		}))
	};
});

vi.mock("http", () => ({
	default: {
		createServer: mockCreateServer.mockImplementation(() => ({
			listen: mockServerListen,
			close: mockServerClose
		}))
	}
}));

vi.mock("socket.io", () => ({
	Server: vi.fn().mockImplementation(() => ({
		use: function () {
			return this as Server;
		},
		on: function () {
			return this as Server;
		},
		close: mockSocketsClose
	}))
}));

vi.mock("@thream/socketio-jwt", () => ({
	authorize: vi.fn(),
	UnauthorizedError: vi.fn()
}));

const settings = {
	frontend: "/test",
	port: 3000
} satisfies HttpServiceSettings;

const services = new ServiceLocator(
	new Map([
		[
			"UserService",
			{
				getSecret: () => "test-secret",
				getUsers: () => [{ username: "test" }],
				getUser: (username: string) => ({ username })
			}
		] as unknown as UserService,
		[
			"DataService",
			{
				on: () => {
					/* Do nothing */
				},
				readLatestValues: () => [{ value: 10 }]
			} as unknown as DataService
		],
		[
			"AlarmService",
			{
				on: () => {
					/* Do nothing */
				},
				getAlarms: () => [{ id: "test-alarm" }]
			} as unknown as AlarmService
		],
		[
			"AssetService",
			{
				on: () => {
					/* Do nothing */
				},
				getAssets: () => [{ id: "test-asset" }]
			} as unknown as AssetService
		],
		[
			"ShoppingListService",
			{
				on: () => {
					/* Do nothing */
				},
				getShoppingList: () => ({ items: [{ id: "item-1" }] })
			} as unknown as ShoppingListService
		],
		["SystemService", {}]
	] as [string, ServiceBase][])
);

test("Server is created", () => {
	const service = new HttpService(services, settings);
	expect(service).not.toBe(null);
});

test("Starts and stops http server", async () => {
	const service = new HttpService(services, settings);

	mockServerListen.mockImplementation(
		(port: number, callback: () => void) => {
			callback();
		}
	);

	await service.start();

	expect(mockServerListen).toHaveBeenCalled();

	mockSocketsClose.mockReturnValue(Promise.resolve());

	service
		.stop()
		.then(() => {
			/* Do nothing */
		})
		.catch((e: unknown) => {
			console.log("Failed");
		});

	await new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		});
	});

	expect(mockServerClose).toHaveBeenCalled();
});

test("Verifies user on socket authentication", () => {
	const service = new HttpService(services, settings);

	const user = service.onSocketAuthentication({
		username: "test",
		locale: "fi"
	});

	expect(user.username).toBe("test");
});

test("Emits initial state on socket connection", () => {
	const service = new HttpService(services, settings);
	const mockEmit = vi.fn();
	const mockOn = vi.fn();

	const mockSocket = {
		emit: mockEmit,
		on: mockOn,
		decodedToken: {
			username: "test"
		}
	} as unknown as Socket;

	service.onSocketConnected(mockSocket);

	expect(mockEmit).toHaveBeenCalledTimes(5);
	expect(mockEmit).toHaveBeenNthCalledWith(1, Messages.USER, {
		username: "test"
	});
	expect(mockEmit).toHaveBeenNthCalledWith(2, Messages.ASSETS, [
		{ id: "test-asset" }
	]);
	expect(mockEmit).toHaveBeenNthCalledWith(3, Messages.VALUES, [
		{ value: 10 }
	]);
	expect(mockEmit).toHaveBeenNthCalledWith(4, Messages.ALARMS, [
		{ id: "test-alarm" }
	]);
	expect(mockEmit).toHaveBeenNthCalledWith(5, Messages.SHOPPINGLIST, {
		items: [{ id: "item-1" }]
	});

	expect(mockOn).toHaveBeenCalledWith(
		Messages.SHOPPINGLIST,
		expect.any(Function)
	);
});
