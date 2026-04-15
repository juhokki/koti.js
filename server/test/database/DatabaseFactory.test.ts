import { expect, test, vi } from "vitest";
import DatabaseFactory from "../../src/service/data/database/DatabaseFactory.js";
import type DatabaseSettings from "../../src/service/data/database/DatabaseSettings.js";
import type InfluxDatabaseSettings from "../../src/service/data/database/influx/InfluxDatabaseSettings.js";
import type TimescaleDatabaseSettings from "../../src/service/data/database/timescale/TimescaleDatabaseSettings.js";

const mockTimescaleDatabase = vi.hoisted(() => vi.fn());
const mockInfluxDatabase = vi.hoisted(() => vi.fn());

vi.mock("../../src/service/data/database/timescale/TimescaleDatabase", () => ({
	default: mockTimescaleDatabase
}));

vi.mock("../../src/service/data/database/influx/InfluxDatabase", () => ({
	default: mockInfluxDatabase
}));

test("TimescaleDatabase is created", () => {
	const options = {
		type: "timescale",
		settings: {
			host: "",
			port: 0,
			database: "",
			user: "",
			password: ""
		} satisfies TimescaleDatabaseSettings
	} satisfies DatabaseSettings;

	const factory = new DatabaseFactory(options);

	factory.create();

	expect(mockTimescaleDatabase).toHaveBeenCalled();
	expect(mockInfluxDatabase).not.toHaveBeenCalled();
});

test("InfluxDatabase is created", () => {
	const options = {
		type: "influxdb",
		settings: {
			host: "",
			database: ""
		} satisfies InfluxDatabaseSettings
	} satisfies DatabaseSettings;

	const factory = new DatabaseFactory(options);

	factory.create();

	expect(mockInfluxDatabase).toHaveBeenCalled();
	expect(mockTimescaleDatabase).not.toHaveBeenCalled();
});
