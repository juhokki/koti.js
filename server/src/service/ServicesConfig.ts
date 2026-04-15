import type ShoppingListServiceSettings from "./shoppinglist/ShoppingListServiceSettings.js";
import type AssetServiceSettings from "./asset/AssetServiceSettings.js";
import type DataServiceSettings from "./data/DataServiceSettings.js";
import type IntegrationServiceSettings from "./integration/IntegrationServiceSettings.js";
import type HttpServiceSettings from "./http/HttpServiceSettings.js";
import type UserServiceSettings from "./user/UserServiceSettings.js";
import type PushApiServiceSettings from "./pushapi/PushApiServiceSettings.js";
import type AlarmServiceSettings from "./alarm/AlarmServiceSettings.js";
import type ActionServiceSettings from "./action/ActionServiceSettings.js";
import type SystemServiceSettings from "./system/SystemServiceSettings.js";
import type SchedulerServiceSettings from "./scheduler/SchedulerServiceSettings.js";

export default interface ServicesConfig {
	AssetService: AssetServiceSettings;
	DataService: DataServiceSettings;
	HttpService: HttpServiceSettings;
	IntegrationService: IntegrationServiceSettings;
	ShoppingListService: ShoppingListServiceSettings;
	UserService: UserServiceSettings;
	AlarmService: AlarmServiceSettings;
	ActionService: ActionServiceSettings;
	PushApiService: PushApiServiceSettings;
	SystemService: SystemServiceSettings;
	SchedulerService: SchedulerServiceSettings;
}
