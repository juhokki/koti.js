import type { PushSubscription } from "web-push";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.js";

export type PostWebPushSubscriptionRequestBody = PushSubscription;

export type PostWebPushSubscriptionRequest = AuthenticatedRequest<
	object,
	object,
	PostWebPushSubscriptionRequestBody,
	object,
	Record<string, unknown>
>;
