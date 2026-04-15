import { vi, expect, test } from "vitest";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import Value from "../../src/model/Value.js";
import RestApiIntegration from "../../src/service/integration/rest/RestApiIntegration.js";
import type DataService from "../../src/service/data/DataService.js";
import type RestApiIntegrationSettings from "../../src/service/integration/rest/RestApiIntegrationConfig.js";

const now = Date.now();
vi.useFakeTimers();
vi.setSystemTime(now);

const settings = {
	enabled: true,
	name: "RestApiIntegration"
} satisfies RestApiIntegrationSettings;

test("RestApiIntegration is created", () => {
	const integration = new RestApiIntegration(new ServiceLocator(), settings);

	expect(integration).not.toBe(null);
});

test("RestApiIntegration writes values", async () => {
	const values = [new Value("device-1", "meas-1", 10, now)];
	const mockWrite = vi.hoisted(() => vi.fn());
	const integration = new RestApiIntegration(
		new ServiceLocator(
			new Map([
				[
					"DataService",
					{
						write: mockWrite
					} as unknown as DataService
				]
			])
		),
		settings
	);

	await integration.write(values);

	expect(mockWrite).toHaveBeenLastCalledWith(values);
});
