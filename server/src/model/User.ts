import { type PushSubscription } from "web-push";

export default class User {
	username: string;
	hash: string;
	locale: string;
	subscriptions: PushSubscription[];

	constructor(
		username: string,
		hash: string,
		locale: string,
		subscriptions: PushSubscription[]
	) {
		this.username = username;
		this.hash = hash;
		this.locale = locale;
		this.subscriptions = subscriptions;
	}
}
