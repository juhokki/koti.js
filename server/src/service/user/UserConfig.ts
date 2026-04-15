import type { PushSubscription } from "web-push";

export default interface UserConfig {
	username: string;
	hash: string;
	locale: string;
	subscriptions: PushSubscription[];
}
