import { expect, test, vi } from "vitest";
import type { PushSubscription } from "web-push";
import AlarmType from "../../src/constants/AlarmType.ts";
import Alarm from "../../src/model/Alarm.js";
import type AlarmService from "../../src/service/alarm/AlarmService.js";
import PushApiService from "../../src/service/pushapi/PushApiService.js";
import type PushApiServiceSettings from "../../src/service/pushapi/PushApiServiceSettings.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import type UserService from "../../src/service/user/UserService.js";

const mockGetUsers = vi.hoisted(() => vi.fn());
const mockOnAlarm = vi.hoisted(() => vi.fn());
const mockSendNotification = vi.hoisted(() => vi.fn());

vi.mock("web-push", () => ({
	default: {
		setVapidDetails: () => {
			/* Do nothing */
		},
		sendNotification: mockSendNotification
	}
}));

const services = new ServiceLocator(
	new Map([
		[
			"UserService",
			{
				getUsers: mockGetUsers
			}
		] as unknown as UserService,
		[
			"AlarmService",
			{
				on: mockOnAlarm
			} as unknown as AlarmService
		]
	] as [string, ServiceBase][])
);

const settings = {
	subject: "subject",
	publicKey: "publicKey",
	privateKey: "privateKey"
} satisfies PushApiServiceSettings;

test("PushApiService is created", () => {
	mockGetUsers.mockReturnValueOnce([]);

	const service = new PushApiService(services, settings);

	expect(service).not.toBe(null);
});

test("PushApiService start subscribes to alarms and fetches subscriptions", async () => {
	const users = [
		{
			username: "test",
			subscriptions: ["test"]
		}
	];

	mockGetUsers.mockReturnValueOnce(users);

	const service = new PushApiService(services, settings);

	await service.start();

	expect(service.subscriptions.length).toBe(1);
	expect(service.subscriptions[0]).toBe("test");
	expect(mockOnAlarm).toHaveBeenCalled();
});

test("PushApiService sends alarm notification", async () => {
	const users = [
		{
			username: "test",
			subscriptions: ["test"]
		}
	];
	const alarm = new Alarm(
		"asset-1",
		"asset-name",
		"device-1",
		"device-name",
		"meas-1",
		"meas-name",
		"name",
		Date.now(),
		AlarmType.Stale
	);

	mockGetUsers.mockReturnValueOnce(users);

	const service = new PushApiService(services, settings);

	await service.start();
	await service.onAlarmsChanged([alarm]);

	expect(mockSendNotification).toHaveBeenLastCalledWith(
		"test",
		JSON.stringify({ title: "asset-name/meas-name", body: "name" })
	);
});

test("PushApiService adds and removes subscriptions", async () => {
	const users = [
		{
			username: "test",
			subscriptions: []
		}
	];

	mockGetUsers.mockReturnValueOnce(users);

	const service = new PushApiService(services, settings);

	await service.start();
	service.addSubscription("test" as unknown as PushSubscription);

	expect(service.subscriptions.length).toBe(1);
	expect(service.subscriptions[0]).toBe("test");

	service.removeSubscription("test" as unknown as PushSubscription);

	expect(service.subscriptions.length).toBe(0);
});
