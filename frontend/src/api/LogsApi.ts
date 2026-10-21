import { LogLevelName, LogPage } from "../interface/Log";
import AuthUtil from "../util/AuthUtil";

class LogsApi {
	async getLogs(
		start: number,
		end: number,
		levels: LogLevelName[]
	): Promise<LogPage> {
		const params = new URLSearchParams({
			start: String(start),
			end: String(end)
		});
		levels.forEach((level) => {
			params.append("level", level);
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
