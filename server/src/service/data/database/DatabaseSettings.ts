import type InfluxDatabaseSettings from "./influx/InfluxDatabaseSettings.ts";
import type TimescaleDatabaseSettings from "./timescale/TimescaleDatabaseSettings.ts";

export default interface DatabaseSettings {
	type: string;
	settings: InfluxDatabaseSettings | TimescaleDatabaseSettings;
}
