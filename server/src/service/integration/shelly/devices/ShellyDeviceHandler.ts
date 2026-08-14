import type Value from "../../../../model/Value.ts";

export default interface ShellyDeviceHandler {
	onDeviceValueChanged(prop: string, value: number): void;
	writeValue(prop: string, value: number): Promise<void>;
	control?(measurementId: string, value: Value): Promise<void>;
}
