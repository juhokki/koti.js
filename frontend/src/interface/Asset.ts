import { ValueType } from "./Value";

export interface Asset {
	id: string;
	name: string;
	icon: string;
	devices: Device[];
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
	VaasanSahkoIntegration = "VaasanSahkoIntegration",
	MatterIntegration = "MatterIntegration",
	WizIntegration = "WizIntegration",
	ShellyIntegration = "ShellyIntegration",
	ToshibaAcIntegration = "ToshibaAcIntegration",
	RestApiIntegration = "RestApiIntegration"
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
	Boolean = "boolean"
}

export interface ActionConfig {
	name: string;
	trigger: ActionTrigger;
	script: string;
}

export enum ActionTrigger {
	OnChange = "onChange"
}

export interface AlarmConfig {
	name: string;
	type: AlarmType;
	limit: number;
}

export enum AlarmType {
	Stale = "stale",
	ValueUpperLimit = "value.upper-limit",
	ValueLowerLimit = "value.lower-limit"
}

export interface ScheduleConfig {
	name: string;
	cron: string;
	value: ValueType;
}
