import type { PushSubscription } from "web-push";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.ts";

export type PutWebPushSubscriptionRequestBody = PushSubscription;

export type PutWebPushSubscriptionRequest = AuthenticatedRequest<
	object,
	object,
	PutWebPushSubscriptionRequestBody,
	object,
	Record<string, unknown>
>;
