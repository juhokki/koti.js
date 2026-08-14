import type DatabaseConnectionSettings from "./DatabaseConnectionSettings.ts";

export default interface DatabaseSettings {
	type: string;
	settings: DatabaseConnectionSettings;
}
