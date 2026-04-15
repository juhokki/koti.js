import { expect, test, vi } from "vitest";
import Koti from "../src/Koti.js";

const mockConfig = vi.hoisted(() => ({}));

vi.mock("../src/util/FileUtil.js", () => ({
	readConfigFile: vi.fn().mockReturnValue(mockConfig)
}));

vi.mock("../src/service/asset/AssetService.js");
vi.mock("../src/service/shoppinglist/ShoppingListService.js");
vi.mock("../src/service/user/UserService.js");
vi.mock("../src/service/data/DataService.js");
vi.mock("../src/service/action/ActionService.js");
vi.mock("../src/service/integration/IntegrationService.js");
vi.mock("../src/service/alarm/AlarmService.js");
vi.mock("../src/service/system/SystemService.js");
vi.mock("../src/service/pushapi/PushApiService.js");
vi.mock("../src/service/scheduler/SchedulerService.js");
vi.mock("../src/service/http/HttpService.js");

test("Koti is created", () => {
	const koti = new Koti("settings.json");
	expect(koti).not.toBe(null);
});

test("Koti starts and stops services", async () => {
	const koti = new Koti("settings.json");
	const services = Array.from(koti.services.values());
	const startSpies = [];
	const stopSpies = [];

	for (const service of services) {
		startSpies.push(vi.spyOn(service, "start"));
		stopSpies.push(vi.spyOn(service, "stop"));
	}

	await koti.start();

	for (const spy of startSpies) {
		expect(spy).toHaveBeenCalled();
	}

	await koti.stop();

	for (const spy of stopSpies) {
		expect(spy).toHaveBeenCalled();
	}
});
