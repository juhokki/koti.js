import webpush, { type PushSubscription } from "web-push";
import ServiceBase from "../ServiceBase.js";
import * as Messages from "../../constants/Messages.js";
import type PushApiServiceSettings from "./PushApiServiceSettings.js";
import type ServiceLocator from "../ServiceLocator.js";
import type Alarm from "../../model/Alarm.js";

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
					console.log(
						`Failed to send handle alarms changed event.`,
						e
					);
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
		console.log(
			`Sending push notification to %i users with title %s and body %s.`,
			this.subscriptions.length,
			title,
			body
		);

		for (const subscription of this.subscriptions) {
			try {
				const payload = JSON.stringify({ title, body });
				await webpush.sendNotification(subscription, payload);
			} catch (e) {
				console.log("Failed to send web-push.", e);
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
			console.log("Unable to find Push API subscription.");
		}
	}
}
