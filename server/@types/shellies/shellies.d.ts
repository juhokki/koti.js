declare module "shellies" {
	export type ShellyDeviceType = "SHBTN-2" | "SHPLG-S";
	export interface ShellyDevice {
		id: string;
		type: ShellyDeviceType;
		host: string;
	}
	export interface ShellyDeviceButton2 extends ShellyDevice {
		inputEventCounter0: number;
		battery: number;
		on: (
			change: string,
			callback: (prop: string, value: number) => void
		) => void;
	}
	export interface ShellyDevicePlugS extends ShellyDevice {
		relay0: boolean;
		power0: number;
		on: (
			change: string,
			callback: (prop: string, value: number | boolean) => void
		) => void;
	}
	export function on(
		topic: string,
		callback: (device: ShellyDeviceButton2 | ShellyDevicePlugS) => void
	): void;
	export function start(): void;
	export function stop(): void;
}
