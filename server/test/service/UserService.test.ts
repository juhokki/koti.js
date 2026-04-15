import { expect, test, vi } from "vitest";
import type { PushSubscription } from "web-push";
import type PushApiService from "../../src/service/pushapi/PushApiService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import UserService from "../../src/service/user/UserService.js";
import type UserServiceSettings from "../../src/service/user/UserServiceSettings.js";

const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockAddSubscription = vi.hoisted(() => vi.fn());
const mockRemoveSubscription = vi.hoisted(() => vi.fn());

vi.mock("fs", () => {
	return {
		writeFileSync: mockWriteFileSync,
		readFileSync: mockReadFileSync
	};
});

const services = new ServiceLocator(
	new Map([
		[
			"PushApiService",
			{
				addSubscription: mockAddSubscription,
				removeSubscription: mockRemoveSubscription
			} as unknown as PushApiService
		]
	] as [string, ServiceBase][])
);

const settings = {
	file: "./users.json",
	secret: "test-secret",
	tokenExpiration: "365d"
} satisfies UserServiceSettings;

test("UserService is created", () => {
	mockReadFileSync.mockReturnValue(JSON.stringify([]));

	const service = new UserService(services, settings);

	expect(service).not.toBe(null);
});

test("Can be started and stopped", async () => {
	const users = [{ username: "test" }];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	expect(service.getUsers()).toStrictEqual([
		expect.objectContaining({
			username: "test"
		})
	]);

	await service.stop();
});

test("Authenticates user", async () => {
	const username = "test";
	const password = "password";
	const hash = UserService.prototype.createPasswordHash(
		password,
		settings.secret
	);
	const users = [
		{
			username: username,
			hash: hash,
			locale: "fi"
		}
	];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	const token = service.authenticate(username, password);

	expect(token).not.toBe(null);
});

test("Verifies JWT token", async () => {
	const username = "test";
	const password = "password";
	const hash = UserService.prototype.createPasswordHash(
		password,
		settings.secret
	);
	const users = [
		{
			username: username,
			hash: hash,
			locale: "fi"
		}
	];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	const token = service.authenticate(username, password);
	const user = service.verifyJWT(token);

	expect(user).not.toBe(null);
	expect(user.username).toBe(username);
});

test("Verifies basic auth token", async () => {
	const username = "test";
	const password = "password";
	const hash = UserService.prototype.createPasswordHash(
		password,
		settings.secret
	);
	const users = [
		{
			username: username,
			hash: hash,
			locale: "fi"
		}
	];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	const user = service.verifyBasic(username, password);

	expect(user).not.toBe(null);
	expect(user.username).toBe(username);
});

test("Fetches user subscription status", async () => {
	const username = "test";
	const users = [
		{
			username: username,
			subscriptions: ["test"]
		}
	];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	expect(
		service.getUserSubscriptionStatus(
			username,
			"test" as unknown as PushSubscription
		)
	).toBe(true);
	expect(
		service.getUserSubscriptionStatus(
			username,
			"false" as unknown as PushSubscription
		)
	).toBe(false);
	expect(() =>
		service.getUserSubscriptionStatus(
			"false",
			"test" as unknown as PushSubscription
		)
	).toThrow();
});

test("Add user subscription", async () => {
	const username = "test";
	const users = [
		{
			username: username,
			subscriptions: []
		}
	];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	expect(service.getUsers()[0]).toStrictEqual(
		expect.objectContaining({
			subscriptions: []
		})
	);

	service.addUserSubscription(
		username,
		"test" as unknown as PushSubscription
	);

	expect(service.getUsers()[0]).toStrictEqual(
		expect.objectContaining({
			subscriptions: ["test"]
		})
	);

	expect(mockAddSubscription).toHaveBeenCalledWith("test");
	expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenLastCalledWith(
		settings.file,
		JSON.stringify(service.getUsers(), null, "\t")
	);
});

test("Remove user subscription", async () => {
	const username = "test";
	const users = [
		{
			username: username,
			subscriptions: ["test"]
		}
	];

	mockReadFileSync.mockReturnValue(JSON.stringify(users));

	const service = new UserService(services, settings);

	await service.start();

	expect(service.getUsers()[0]).toStrictEqual(
		expect.objectContaining({
			subscriptions: ["test"]
		})
	);

	service.deleteUserSubscription(
		username,
		"test" as unknown as PushSubscription
	);

	expect(service.getUsers()[0]).toStrictEqual(
		expect.objectContaining({
			subscriptions: []
		})
	);

	expect(mockRemoveSubscription).toHaveBeenCalledWith("test");
	expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenLastCalledWith(
		settings.file,
		JSON.stringify(service.getUsers(), null, "\t")
	);
});
