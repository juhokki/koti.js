import type DatabaseSettings from "./database/DatabaseSettings.js";

export default interface DataServiceSettings {
	database: DatabaseSettings;
}
