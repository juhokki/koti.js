import { expect, test } from "vitest";
import ServiceBase from "../../src/service/ServiceBase.ts";
import ServiceLocator from "../../src/service/ServiceLocator.ts";

test("ServiceBase exposes empty parameters by default", () => {
	const service = new ServiceBase(new ServiceLocator());

	expect(service.getParameters()).toEqual([]);
});

test("ServiceLocator returns registered service names", () => {
	const first = new ServiceBase(new ServiceLocator());
	const second = new ServiceBase(new ServiceLocator());
	const services = new ServiceLocator();
	services.set("FirstService", first);
	services.set("SecondService", second);

	expect(services.getNames()).toEqual(["FirstService", "SecondService"]);
});
