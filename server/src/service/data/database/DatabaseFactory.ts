import type DatabaseSettings from "./DatabaseSettings.js";
import InfluxDatabase from "./influx/InfluxDatabase.js";
import type InfluxDatabaseSettings from "./influx/InfluxDatabaseSettings.js";
import TimescaleDatabase from "./timescale/TimescaleDatabase.js";
import type TimescaleDatabaseSettings from "./timescale/TimescaleDatabaseSettings.js";

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
