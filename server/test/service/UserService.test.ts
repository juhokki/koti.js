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
	tokenExpiration: 31536000
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

test("Rejects missing and invalid credentials", () => {
	const password = "password";
	const hash = UserService.prototype.createPasswordHash(
		password,
		settings.secret
	);
	mockReadFileSync.mockReturnValue(
		JSON.stringify([{ username: "test", hash, locale: "fi" }])
	);
	const service = new UserService(services, settings);

	expect(() => service.authenticate("", password)).toThrow(
		"Missing credentials."
	);
	expect(() => service.authenticate("test", "")).toThrow(
		"Missing credentials."
	);
	expect(() => service.authenticate("missing", password)).toThrow(
		"Authentication failed."
	);
	expect(() => service.authenticate("test", "wrong-password")).toThrow(
		"Authentication failed."
	);
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

test("Rejects a valid JWT after its user is removed", () => {
	const username = "test";
	const password = "password";
	const hash = UserService.prototype.createPasswordHash(
		password,
		settings.secret
	);
	mockReadFileSync.mockReturnValue(
		JSON.stringify([{ username, hash, locale: "fi" }])
	);
	const service = new UserService(services, settings);
	const token = service.authenticate(username, password);
	service.users = [];

	expect(() => service.verifyJWT(token)).toThrow(
		`Token was verified, but user ${username} does not exist.`
	);
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

test("Rejects invalid basic credentials", () => {
	const hash = UserService.prototype.createPasswordHash(
		"password",
		settings.secret
	);
	mockReadFileSync.mockReturnValue(
		JSON.stringify([{ username: "test", hash, locale: "fi" }])
	);
	const service = new UserService(services, settings);

	expect(() => service.verifyBasic("missing", "password")).toThrow(
		"Not able to verify user missing"
	);
	expect(() => service.verifyBasic("test", "wrong-password")).toThrow(
		"Not able to verify user test"
	);
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

	expect(mockAddSubscription).toHaveBeenCalledWith(username, "test");
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

	expect(mockRemoveSubscription).toHaveBeenCalledWith(username, "test");
	expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
	expect(mockWriteFileSync).toHaveBeenLastCalledWith(
		settings.file,
		JSON.stringify(service.getUsers(), null, "\t")
	);
});

test("Rejects subscription changes for unknown users", () => {
	mockReadFileSync.mockReturnValue(JSON.stringify([]));
	const service = new UserService(services, settings);
	const subscription = "test" as unknown as PushSubscription;

	expect(() => {
		service.addUserSubscription("missing", subscription);
	}).toThrow("User not found");
	expect(() => {
		service.deleteUserSubscription("missing", subscription);
	}).toThrow("User not found");
});

test("Does not save when the subscription to delete is absent", () => {
	mockReadFileSync.mockReturnValue(
		JSON.stringify([{ username: "test", subscriptions: ["other"] }])
	);
	const service = new UserService(services, settings);

	service.deleteUserSubscription(
		"test",
		"missing" as unknown as PushSubscription
	);

	expect(mockRemoveSubscription).not.toHaveBeenCalled();
	expect(mockWriteFileSync).not.toHaveBeenCalled();
});

test("Handles failures while saving user changes", () => {
	mockReadFileSync.mockReturnValue(JSON.stringify([]));
	mockWriteFileSync.mockImplementationOnce(() => {
		throw new Error("Disk is full");
	});
	const service = new UserService(services, settings);

	expect(() => {
		service.saveUserChanges();
	}).not.toThrow();
});
