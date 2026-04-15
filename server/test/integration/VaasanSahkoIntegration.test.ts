import { expect, vi, test } from "vitest";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Value from "../../src/model/Value.js";
import VaasanSahkoIntegration, {
	DATE_FORMAT,
	EXCEL_DATE_FORMAT,
	LOGIN_TOKEN_URL,
	LOGIN_URL,
	EXCEL_GENERATE_URL,
	EXCEL_DOWNLOAD_URL,
	EXCEL_TOKEN_URL
} from "../../src/service/integration/vaasansahko/VaasanSahkoIntegration.js";
import type DataService from "../../src/service/data/DataService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import type VaasanSahkoIntegrationSettings from "../../src/service/integration/vaasansahko/VaasanSahkoIntegrationConfig.js";

const mockFetch = vi.hoisted(() => vi.fn());
const mockCronTaskStart = vi.hoisted(() => vi.fn());
const mockCronTaskStop = vi.hoisted(() => vi.fn());
const mockCronSchedule = vi.hoisted(() => vi.fn());
const mockReadLatestValue = vi.hoisted(() => vi.fn());
const mockWrite = vi.hoisted(() => vi.fn());

vi.mock("node-fetch", () => ({ default: mockFetch }));

vi.mock("node-cron", () => ({
	default: {
		schedule: mockCronSchedule.mockReturnValue({
			start: mockCronTaskStart,
			stop: mockCronTaskStop
		})
	}
}));

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const services = new ServiceLocator(
	new Map([
		[
			"DataService",
			{
				readLatestValue: mockReadLatestValue,
				write: mockWrite
			} as unknown as DataService
		]
	] as [string, ServiceBase][])
);

const settings = {
	enabled: true,
	name: "VaasanSahkoIntegration",
	deviceId: "sahko",
	measurementId: "kwh",
	schedule: "0 8 * * *",
	username: "test",
	password: "password"
} satisfies VaasanSahkoIntegrationSettings;

test("VaasanSahkoIntegration is created", () => {
	const integration = new VaasanSahkoIntegration(services, settings);
	expect(integration).not.toBe(null);
});

test("Start sets timer and calls update", async () => {
	const token = "token";
	const token2 = "token2";
	const identifier = "1";
	const startTs = dayjs(now).subtract(5, "days").valueOf();
	const start = dayjs(startTs).format(DATE_FORMAT);
	const end = dayjs(now).subtract(1, "days").format(DATE_FORMAT);
	const excelGenerateUrl = EXCEL_GENERATE_URL.replace(
		"${start}",
		start
	).replace("${end}", end);
	const excelDownloadUrl = EXCEL_DOWNLOAD_URL.replace(
		"${identifier}",
		identifier
	);
	const integration = new VaasanSahkoIntegration(services, settings);

	mockFetch.mockImplementation((url) => {
		switch (url) {
			case LOGIN_TOKEN_URL:
				return {
					headers: {
						raw: () => ({
							"set-cookie": ["SESSIONID=1;"]
						})
					},
					text: () =>
						`<input name="__RequestVerificationToken" type="hidden" value="${token}" />"`
				};
			case LOGIN_URL:
				return {
					headers: {
						raw: () => ({
							"set-cookie": ["SESSIONID=2;"]
						})
					}
				};
			case EXCEL_TOKEN_URL:
				return {
					text: () =>
						`<input name="__RequestVerificationToken" type="hidden" value="${token2}" />"`
				};
			case excelGenerateUrl:
				return {
					status: 200,
					json: () => ({ identifier: identifier })
				};
			case excelDownloadUrl:
				return {
					arrayBuffer: () => {
						const aoa = [
							["Sähkön yhteenvetosivu", ""],
							["", ""],
							["Aika", "Kohde"],
							[dayjs(startTs).format(EXCEL_DATE_FORMAT), 10],
							[
								dayjs(startTs)
									.add(1, "days")
									.format(EXCEL_DATE_FORMAT),
								11
							],
							[
								dayjs(startTs)
									.add(2, "days")
									.format(EXCEL_DATE_FORMAT),
								12
							],
							[
								dayjs(startTs)
									.add(3, "days")
									.format(EXCEL_DATE_FORMAT),
								13
							],
							[
								dayjs(startTs)
									.add(4, "days")
									.format(EXCEL_DATE_FORMAT),
								14
							]
						];
						const ws = XLSX.utils.aoa_to_sheet(aoa);
						const wb = XLSX.utils.book_new(ws, "Sheet1");
						const data = XLSX.write(wb, {
							bookType: "xlsx",
							type: "array"
						}) as ArrayBuffer;

						return data;
					}
				};
		}
	});

	mockReadLatestValue.mockReturnValueOnce(
		new Value("device-1", "meas-1", 10, startTs)
	);

	await integration.start();

	expect(mockCronSchedule).toHaveBeenCalled();
	expect(integration.buildCookieString()).toStrictEqual("SESSIONID=2");
	expect(mockWrite).toHaveBeenCalledWith([
		expect.objectContaining({
			time: dayjs(startTs).add(1, "days").startOf("day").valueOf(),
			value: 11
		}),
		expect.objectContaining({
			time: dayjs(startTs).add(2, "days").startOf("day").valueOf(),
			value: 12
		}),
		expect.objectContaining({
			time: dayjs(startTs).add(3, "days").startOf("day").valueOf(),
			value: 13
		}),
		expect.objectContaining({
			time: dayjs(startTs).add(4, "days").startOf("day").valueOf(),
			value: 14
		})
	]);

	await integration.stop();

	expect(mockCronTaskStop).toHaveBeenCalled();
});
