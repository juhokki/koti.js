import type DatabaseConnectionSettings from "../DatabaseConnectionSettings.ts";

export default interface InfluxDatabaseSettings extends DatabaseConnectionSettings {
	host: string;
	database: string;
}
