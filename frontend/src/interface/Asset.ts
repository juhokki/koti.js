import { AlarmType } from "./Alarm";
import { ValueType } from "./Value";

export interface Asset {
	id: string;
	name: string;
	icon: string;
	links?: string[];
	devices: Device[];
	summary?: {
		devices: {
			device: Device;
			displayName: string;
			measurements: Measurement[];
		}[];
	};
}

export interface Device {
	id: string;
	type: DeviceType;
	name: string;
	icon: string;
	measurements: Measurement[];
	onlineStatus: DeviceOnlineStatus;
}

export enum DeviceType {
	MatterIntegration = "MatterIntegration",
	ShellyIntegration = "ShellyIntegration",
	ToshibaAcIntegration = "ToshibaAcIntegration",
	RestApiIntegration = "RestApiIntegration",
	ElectricityPriceIntegration = "ElectricityPriceIntegration",
	OpenWeatherIntegration = "OpenWeatherIntegration"
}

export interface Measurement {
	deviceId: string;
	id: string;
	name: string;
	type: MeasurementType;
	unit: string;
	icon: string;
	controllable: boolean;
	min: number | undefined;
	max: number | undefined;
	steps?: number[];
	actions: ActionConfig[];
	alarms: AlarmConfig[];
	schedules: ScheduleConfig[];
	disabled: boolean;
}

export enum DeviceOnlineStatus {
	ONLINE = "online",
	OFFLINE = "offline",
	UNKNOWN = "unknown"
}

export enum MeasurementType {
	Number = "number",
	String = "string",
	Boolean = "boolean",
	Counter = "counter"
}

export interface ActionConfig {
	name: string;
	trigger: ActionTrigger;
	script: string;
}

export enum ActionTrigger {
	OnChange = "onChange",
	OnInitialValue = "onInitialValue"
}

export interface AlarmConfig {
	name: string;
	type: AlarmType;
	limit: number;
}

export enum ScheduleType {
	Cron = "cron",
	Suncalc = "suncalc"
}

export interface CronScheduleOptions {
	expression: string;
}

export interface SuncalcScheduleOptions {
	lat: number;
	lng: number;
	property: string;
}

export interface ScheduleConfig {
	name: string;
	type: ScheduleType;
	options: CronScheduleOptions | SuncalcScheduleOptions;
	value: ValueType;
}
