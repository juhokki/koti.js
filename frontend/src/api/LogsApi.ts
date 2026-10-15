import { LogLevelName, LogPage } from "../interface/Log";
import AuthUtil from "../util/AuthUtil";

class LogsApi {
	async getLogs(
		start: number,
		limit: number,
		level: LogLevelName
	): Promise<LogPage> {
		const params = new URLSearchParams({
			start: String(start),
			limit: String(limit),
			level
		});
		const url = `/api/logs?${params.toString()}`;
		const options = {
			method: "GET",
			headers: {
				Authorization: AuthUtil.buildAuthorization()
			}
		};

		const response = await fetch(url, options);

		if (!response.ok) {
			throw new Error("Failed to fetch logs: " + String(response.status));
		}

		return (await response.json()) as LogPage;
	}
}

export default new LogsApi();
