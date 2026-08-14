import type { PushSubscription } from "web-push";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.ts";

export type DeleteWebPushSubscriptionRequestBody = PushSubscription;

export type DeleteWebPushSubscriptionRequest = AuthenticatedRequest<
	object,
	object,
	DeleteWebPushSubscriptionRequestBody,
	object,
	Record<string, unknown>
>;
