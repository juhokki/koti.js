import { SubscribeStatus } from "../interface/Subscription";
import AuthUtil from "../util/AuthUtil";

class WebPushApi {
	async checkSubscription(subscription: PushSubscription): Promise<SubscribeStatus> {
		const url = "/api/user/web-push";
		const options = {
			method: "PUT",
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify(subscription)
		};

		const response = await fetch(url, options);

		return await response.json() as SubscribeStatus;
	}

	async subscribe(subscription: PushSubscription): Promise<void> {
		const url = "/api/user/web-push";
		const options = {
			method: "POST",
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify(subscription)
		};

		const response = await fetch(url, options);

		if (response.status !== 200) {
			throw new Error("Failed to subscribe");
		}

		return Promise.resolve();
	}

	async cancelSubscription(subscription: PushSubscription): Promise<void> {
		const url = "/api/user/web-push";
		const options = {
			method: "DELETE",
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify(subscription)
		};


		const response = await fetch(url, options);

		if (response.status !== 200) {
			throw new Error("Failed to cancel subscription");
		}

		return Promise.resolve();
	}
}

export default new WebPushApi();
