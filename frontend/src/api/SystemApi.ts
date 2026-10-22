import { SystemState } from "../interface/SystemState";
import { IntegrationInfo } from "../interface/IntegrationInfo";
import AuthUtil from "../util/AuthUtil";

class SystemApi {
	async getSystemStats(): Promise<SystemState> {
		const url = "/api/system";
		const options = {
			method: "GET",
			headers: {
				Authorization: AuthUtil.buildAuthorization()
			}
		};

		const response = await fetch(url, options);

		return (await response.json()) as SystemState;
	}

	async getIntegration(name: string): Promise<IntegrationInfo> {
		const url = `/api/system/integration?name=${encodeURIComponent(name)}`;
		const options = {
			method: "GET",
			headers: {
				Authorization: AuthUtil.buildAuthorization()
			}
		};

		const response = await fetch(url, options);

		if (!response.ok) {
			throw new Error(`Request failed with status ${String(response.status)}`);
		}

		return (await response.json()) as IntegrationInfo;
	}
}

export default new SystemApi();
