import type DatabaseConnectionSettings from "../DatabaseConnectionSettings.ts";

export default interface TimescaleDatabaseSettings
	extends DatabaseConnectionSettings {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
}
