import AuthUtil from "../util/AuthUtil";

export interface ExecuteActionResult {
	ok: boolean;
	error?: string;
}

class ActionsApi {
	async executeAction(
		deviceId: string,
		measurementId: string,
		name: string,
		trigger: string
	): Promise<ExecuteActionResult> {
		const response = await fetch("/api/actions/execute", {
			method: "POST",
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ deviceId, measurementId, name, trigger })
		});

		if (!response.ok) {
			throw new Error(
				`Request failed with status ${String(response.status)}`
			);
		}

		return (await response.json()) as ExecuteActionResult;
	}
}

export default new ActionsApi();
