import { expect, test, vi } from "vitest";
import { WebPushError, type PushSubscription } from "web-push";
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
const MockWebPushError = vi.hoisted(
	() =>
		class extends Error {
			statusCode: number;

			constructor(message: string, statusCode: number) {
				super(message);
				this.statusCode = statusCode;
			}
		}
);

vi.mock("web-push", () => ({
	default: {
		setVapidDetails: () => {
			/* Do nothing */
		},
		sendNotification: mockSendNotification
	},
	WebPushError: MockWebPushError
}));

const mockDeleteUserSubscription = vi.hoisted(() => vi.fn());
const services = new ServiceLocator(
	new Map([
		[
			"UserService",
			{
				getUsers: mockGetUsers,
				deleteUserSubscription: mockDeleteUserSubscription
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
	expect(service.subscriptions[0]?.subscription).toBe("test");
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

test("Sends only newer alarms and advances the alarm cursor", async () => {
	mockGetUsers.mockReturnValueOnce([]);
	const service = new PushApiService(services, settings);
	service.alarmsLastSent = 10;
	const oldAlarm = new Alarm(
		"asset-1",
		"asset-name",
		"device-1",
		"device-name",
		"meas-1",
		"meas-name",
		"old",
		10,
		AlarmType.Stale
	);
	const newAlarm = new Alarm(
		"asset-1",
		"asset-name",
		"device-1",
		"device-name",
		"meas-1",
		"meas-name",
		"new",
		20,
		AlarmType.Stale
	);

	await service.onAlarmsChanged([oldAlarm, newAlarm]);

	expect(mockSendNotification).toHaveBeenCalledTimes(0);
	expect(service.alarmsLastSent).toBe(20);
});

test("Advances the alarm cursor when no new alarms are present", async () => {
	mockGetUsers.mockReturnValueOnce([]);
	const service = new PushApiService(services, settings);
	service.alarmsLastSent = Date.now() + 1000;

	await service.onAlarmsChanged([]);

	expect(service.alarmsLastSent).toBeLessThanOrEqual(Date.now());
	expect(mockSendNotification).not.toHaveBeenCalled();
});

test("Removes subscriptions after a push endpoint returns 410", async () => {
	mockGetUsers.mockReturnValueOnce([]);
	const service = new PushApiService(services, settings);
	const subscription = { endpoint: "https://push.example" } as PushSubscription;
	service.addSubscription("test", subscription);
	mockSendNotification.mockRejectedValueOnce(
		new WebPushError("Subscription expired", 410, {}, "", subscription.endpoint)
	);

	await service.sendToSubscribedUsers("title", "body");

	expect(mockDeleteUserSubscription).toHaveBeenCalledWith(
		"test",
		subscription
	);
});

test("Keeps subscriptions after non-410 notification failures", async () => {
	mockGetUsers.mockReturnValueOnce([]);
	const service = new PushApiService(services, settings);
	const subscription = { endpoint: "https://push.example" } as PushSubscription;
	service.addSubscription("test", subscription);
	mockSendNotification.mockRejectedValueOnce(new Error("Temporary failure"));

	await service.sendToSubscribedUsers("title", "body");

	expect(mockDeleteUserSubscription).not.toHaveBeenCalled();
	expect(service.subscriptions).toHaveLength(1);
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
	service.addSubscription("test", "test" as unknown as PushSubscription);

	expect(service.subscriptions.length).toBe(1);
	expect(service.subscriptions[0]?.subscription).toBe("test");

	service.removeSubscription("test", "test" as unknown as PushSubscription);

	expect(service.subscriptions.length).toBe(0);
});
