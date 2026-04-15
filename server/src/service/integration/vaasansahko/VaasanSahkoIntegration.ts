import fetch, { Response } from "node-fetch";
import cron, { type ScheduledTask } from "node-cron";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import IntegrationBase from "../IntegrationBase.js";
import Value from "../../../model/Value.js";
import type VaasanSahkoIntegrationSettings from "./VaasanSahkoIntegrationConfig.js";
import type ServiceLocator from "../../ServiceLocator.js";

dayjs.extend(customParseFormat);

export const SET_COOKIE_HEADER = "set-cookie";
export const DATE_FORMAT = "M.D.YYYY";
export const EXCEL_DATE_FORMAT = "D.M.YYYY";
export const LOGIN_URL = "https://online.vaasansahko.fi/eServices/Online/Login";
export const LOGIN_TOKEN_URL =
	"https://online.vaasansahko.fi/eServices/Online/IndexNoAuth";
export const EXCEL_GENERATE_URL =
	"https://online.vaasansahko.fi/Reporting/CustomerConsumption/GenerateExcelFile?start=${start}&end=${end}&selectedTimeSpan=day";
export const EXCEL_DOWNLOAD_URL =
	"https://online.vaasansahko.fi/Reporting/CustomerConsumption/DownloadExcelFile?identifier=${identifier}";
export const EXCEL_TOKEN_URL =
	"https://online.vaasansahko.fi/Reporting/CustomerConsumption";

export interface GenerateExcelResponse {
	identifier: "string";
}

export default class VaasanSahkoIntegration extends IntegrationBase {
	options: VaasanSahkoIntegrationSettings;
	task: ScheduledTask | undefined;
	cookies: Map<string, string>;

	constructor(
		services: ServiceLocator,
		options: VaasanSahkoIntegrationSettings
	) {
		super(services);

		this.options = options;
		this.cookies = new Map();
	}

	override async start() {
		this.task = cron.schedule(
			this.options.schedule,
			() => {
				this.update().catch((e: unknown) => {
					console.log("Failed to update.", e);
				});
			},
			{ scheduled: false }
		);

		this.task.start();

		await this.update();
	}

	override stop() {
		if (this.task) {
			this.task.stop();
		}

		return Promise.resolve();
	}

	async update() {
		try {
			await this.login();

			const dataService = this.services.getDataService();
			const latestValue = dataService.readLatestValue(
				this.options.deviceId,
				this.options.measurementId
			);
			const values = await this.fetchConsumption(latestValue);

			await this.services.getDataService().write(values);
		} catch (error) {
			console.log("Failed to update consumption.", error);
		}
	}

	async login() {
		this.cookies.clear();

		const verificationToken = await this.fetchVerificationToken();
		const params = new URLSearchParams();
		params.append("UserName", this.options.username);
		params.append("Password", this.options.password);
		params.append("__RequestVerificationToken", verificationToken);

		const options = {
			redirect: "manual" as RequestRedirect,
			headers: {
				Accept: "*/*",
				Cookie: this.buildCookieString(),
				"Content-Type": "application/x-www-form-urlencoded"
			},
			method: "POST",
			body: params
		};

		const response = await fetch(LOGIN_URL, options);
		this.addResponseCookies(response);
	}

	async fetchVerificationToken(): Promise<string> {
		const options = {
			method: "GET"
		};

		const response = await fetch(LOGIN_TOKEN_URL, options);
		this.addResponseCookies(response);

		const data = await response.text();
		const verificationTokenRegex =
			/(?<=<input name="__RequestVerificationToken" type="hidden" value=")([\w-]+)(?=" \/>)/;
		const matches = verificationTokenRegex.exec(data);

		if (!matches) {
			throw new Error("Missing verification token.");
		}

		return matches[0];
	}

	async fetchConsumption(latestValue: Value | undefined) {
		const start = dayjs(
			latestValue
				? latestValue.time
				: dayjs().subtract(1, "month").valueOf()
		).format(DATE_FORMAT);
		const end = dayjs().subtract(1, "day").format(DATE_FORMAT);
		const token = await this.fetchExcelVerificationToken();
		const identifier = await this.generateExcel(start, end, token);
		const response = await this.downloadExcel(identifier);
		const values = await this.parseExcel(response, latestValue);

		return values;
	}

	async fetchExcelVerificationToken() {
		const url = EXCEL_TOKEN_URL;
		const options = {
			headers: {
				Accept: "*/*",
				Cookie: this.buildCookieString()
			},
			method: "GET"
		};

		const response = await fetch(url, options);
		const data = await response.text();
		const verificationTokenRegex =
			/(?<=<input name="__RequestVerificationToken" type="hidden" value=")([\w-]+)(?=" \/>)/;
		const matches = verificationTokenRegex.exec(data);

		if (!matches) {
			throw new Error("Missing verification token.");
		}

		return matches[0];
	}

	async generateExcel(start: string, end: string, token: string) {
		const url = EXCEL_GENERATE_URL.replace("${start}", start).replace(
			"${end}",
			end
		);
		const params = new URLSearchParams();
		params.append("__RequestVerificationToken", token);

		const options = {
			headers: {
				accept: "*/*",
				cookie: this.buildCookieString(),
				"Content-Type": "application/x-www-form-urlencoded"
			},
			method: "POST",
			body: params
		};

		const response = await fetch(url, options);

		if (response.status !== 200) {
			throw new Error(
				`Request failed with response status ${response.status.toString()}`
			);
		}

		const data = (await response.json()) as GenerateExcelResponse;
		const identifier = data.identifier;

		return identifier;
	}

	async downloadExcel(identifier: string) {
		const url = EXCEL_DOWNLOAD_URL.replace("${identifier}", identifier);
		const options = {
			headers: {
				accept: "*/*",
				cookie: this.buildCookieString()
			},
			method: "GET"
		};

		return await fetch(url, options);
	}

	async parseExcel(response: Response, latestValue: Value | undefined) {
		const buffer = await response.arrayBuffer();
		const workbook = XLSX.read(buffer);
		const sheets = Object.values(workbook.Sheets) as [XLSX.WorkSheet];
		const summarySheet = sheets[0];
		const rows: object[] = XLSX.utils.sheet_to_json(summarySheet, {
			range: 2
		});
		const values: Value[] = [];

		rows.forEach((row: object) => {
			const entries = Object.entries(row) as [
				[string, string],
				[string, number]
			];
			const rowTime = entries[0][1];
			const rowValue = entries[1][1];
			const time = dayjs(rowTime, EXCEL_DATE_FORMAT).valueOf();

			if (!rowValue) {
				return;
			}

			if (latestValue && latestValue.time >= time) {
				return;
			}

			values.push(
				new Value(this.options.deviceId, "kwh", rowValue, time)
			);
		});

		return values;
	}

	addResponseCookies(response: Response) {
		const rawHeaders: Record<"set-cookie", string[]> =
			response.headers.raw();
		const header: string[] = rawHeaders[SET_COOKIE_HEADER];

		header.forEach((entry) => {
			const parts = entry.split(";") as [string];
			const [name, value] = parts[0].split("=") as [string, string];

			this.cookies.set(name, value);
		});
	}

	buildCookieString() {
		const strings = [];

		for (const entry of this.cookies.entries()) {
			strings.push(`${entry[0]}=${entry[1]}`);
		}

		return strings.join(";");
	}
}
