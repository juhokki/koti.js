import type InfluxDatabaseSettings from "./influx/InfluxDatabaseSettings.js";
import type TimescaleDatabaseSettings from "./timescale/TimescaleDatabaseSettings.js";

export default interface DatabaseSettings {
	type: string;
	settings: InfluxDatabaseSettings | TimescaleDatabaseSettings;
}
