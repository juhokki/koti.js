import webpush, { type PushSubscription } from "web-push";
import ServiceBase from "../ServiceBase.ts";
import * as Messages from "../../constants/Messages.ts";
import type PushApiServiceSettings from "./PushApiServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type Alarm from "../../model/Alarm.ts";
import logger from "../../util/logger.ts";

export default class PushApiService extends ServiceBase {
	options: PushApiServiceSettings;
	subscriptions: PushSubscription[];
	alarmsLastSent: number;

	constructor(services: ServiceLocator, options: PushApiServiceSettings) {
		super(services);

		this.options = options;
		this.subscriptions = this.readSubscriptions();
		this.alarmsLastSent = -1;
	}

	readSubscriptions(): PushSubscription[] {
		return this.services
			.getUserService()
			.getUsers()
			.map((user) => {
				return user.subscriptions;
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

		for (const subscription of this.subscriptions) {
			try {
				const payload = JSON.stringify({ title, body });
				await webpush.sendNotification(subscription, payload);
			} catch (e) {
				logger.error(e, "Failed to send web-push.");
			}
		}
	}

	addSubscription(subscription: PushSubscription) {
		this.subscriptions.push(subscription);
	}

	removeSubscription(subscription: PushSubscription) {
		const index = this.subscriptions.findIndex(
			(s) => JSON.stringify(s) === JSON.stringify(subscription)
		);

		if (index !== -1) {
			this.subscriptions.splice(index, 1);
		} else {
			logger.warn("Unable to find Push API subscription.");
		}
	}
}
