import type ShoppingListServiceSettings from "./shoppinglist/ShoppingListServiceSettings.ts";
import type AssetServiceSettings from "./asset/AssetServiceSettings.ts";
import type DataServiceSettings from "./data/DataServiceSettings.ts";
import type IntegrationServiceSettings from "./integration/IntegrationServiceSettings.ts";
import type HttpServiceSettings from "./http/HttpServiceSettings.ts";
import type UserServiceSettings from "./user/UserServiceSettings.ts";
import type PushApiServiceSettings from "./pushapi/PushApiServiceSettings.ts";
import type AlarmServiceSettings from "./alarm/AlarmServiceSettings.ts";
import type ActionServiceSettings from "./action/ActionServiceSettings.ts";
import type SystemServiceSettings from "./system/SystemServiceSettings.ts";
import type SchedulerServiceSettings from "./scheduler/SchedulerServiceSettings.ts";

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
