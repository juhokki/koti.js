import { SystemDiskState } from "../interface/SystemDiskState";
import AuthUtil from "../util/AuthUtil";

class SystemApi {
	async getSystemStats(): Promise<SystemDiskState> {
		const url = "/api/system";
		const options = {
			method: "GET",
			headers: {
				Authorization: AuthUtil.buildAuthorization()
			}
		};

		const response = await fetch(url, options);

		return (await response.json()) as SystemDiskState;
	}
}

export default new SystemApi();
