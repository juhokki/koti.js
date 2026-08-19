import { type PushSubscription } from "web-push";

export interface UserSubscription {
    username: string;
    subscription: PushSubscription;
}