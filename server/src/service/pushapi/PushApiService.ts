import webpush, { WebPushError, type PushSubscription } from "web-push";
import ServiceBase from "../ServiceBase.ts";
import * as Messages from "../../constants/Messages.ts";
import type PushApiServiceSettings from "./PushApiServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type Alarm from "../../model/Alarm.ts";
import logger from "../../util/logger.ts";
import type { UserSubscription } from "./UserSubscription.ts";

export default class PushApiService extends ServiceBase {
	options: PushApiServiceSettings;
	subscriptions: UserSubscription[];
	alarmsLastSent: number;

	constructor(services: ServiceLocator, options: PushApiServiceSettings) {
		super(services);

		this.options = options;
		this.subscriptions = this.readSubscriptions();
		this.alarmsLastSent = -1;
	}

	readSubscriptions(): UserSubscription[] {
		return this.services
			.getUserService()
			.getUsers()
			.map((user) => {
				return user.subscriptions.map(
					(subscription) =>
						({
							username: user.username,
							subscription: subscription
						}) satisfies UserSubscription
				);
			})
			.flat();
	}

	override start() {
		webpush.setVapidDetails(
			this.options.subject,
			this.options.publicKey,
			this.options.privateKey
		);

		this.services
			.getAlarmService()
			.on(Messages.ALARMS, (alarms: Alarm[]) => {
				this.onAlarmsChanged(alarms).catch((e: unknown) => {
					logger.error(e, "Failed to handle alarms changed event.");
				});
			});

		return Promise.resolve();
	}

	async onAlarmsChanged(alarms: Alarm[]) {
		const newAlarms = alarms.filter((alarm) => {
			return alarm.time > this.alarmsLastSent;
		});

		if (newAlarms.length) {
			for (const alarm of newAlarms) {
				const title = `${alarm.assetName}/${alarm.measurementName}`;
				const body = alarm.name;
				await this.sendToSubscribedUsers(title, body);
			}

			this.alarmsLastSent = Math.max(
				...newAlarms.map((alarm) => alarm.time)
			);
		} else {
			this.alarmsLastSent = Date.now();
		}
	}

	async sendToSubscribedUsers(title: string, body: string) {
		logger.info(
			`Sending push notification to ${String(this.subscriptions.length)} users with title "${title}" and body "${body}".`
		);

		for (const userSubscription of this.subscriptions) {
			try {
				const payload = JSON.stringify({ title, body });
				await webpush.sendNotification(
					userSubscription.subscription,
					payload
				);
			} catch (e) {
				// Remove subscription if it is no longer valid (HTTP 410 Gone)
				if (e instanceof WebPushError && e.statusCode === 410) {
					this.removeStaleSubscription(userSubscription);
				}

				logger.error(e, "Failed to send web-push.");
			}
		}
	}

	removeStaleSubscription(userSubscription: UserSubscription) {
		this.services
			.getUserService()
			.deleteUserSubscription(
				userSubscription.username,
				userSubscription.subscription
			);
	}

	addSubscription(username: string, subscription: PushSubscription) {
		this.subscriptions.push({ username, subscription });
	}

	removeSubscription(username: string, subscription: PushSubscription) {
		this.subscriptions = this.subscriptions.filter(
			(s) =>
				s.username === username &&
				JSON.stringify(s.subscription) !== JSON.stringify(subscription)
		);
	}
}
