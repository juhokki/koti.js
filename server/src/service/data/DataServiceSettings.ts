import type DatabaseSettings from "./database/DatabaseSettings.ts";

export default interface DataServiceSettings {
	database: DatabaseSettings;
}
