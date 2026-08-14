import type DatabaseSettings from "./DatabaseSettings.ts";
import InfluxDatabase from "./influx/InfluxDatabase.ts";
import type InfluxDatabaseSettings from "./influx/InfluxDatabaseSettings.ts";
import TimescaleDatabase from "./timescale/TimescaleDatabase.ts";
import type TimescaleDatabaseSettings from "./timescale/TimescaleDatabaseSettings.ts";

export default class DatabaseFactory {
	options: DatabaseSettings;

	constructor(options: DatabaseSettings) {
		this.options = options;
	}

	create() {
		switch (this.options.type) {
			case "influxdb":
				return new InfluxDatabase(
					this.options.settings as InfluxDatabaseSettings
				);
			case "timescale":
				return new TimescaleDatabase(
					this.options.settings as TimescaleDatabaseSettings
				);
			default:
				throw new Error(`Unknown database type ${this.options.type}`);
		}
	}
}
