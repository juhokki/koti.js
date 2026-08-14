import type Value from "../../model/Value.ts";

export default class ValueCache {
	cache: Map<string, Value>;

	constructor() {
		this.cache = new Map();
	}

	set(deviceId: string, measurementId: string, value: Value) {
		this.cache.set(this.getValueKey(deviceId, measurementId), value);
	}

	get(deviceId: string, measurementId: string): Value | undefined {
		return this.cache.get(this.getValueKey(deviceId, measurementId));
	}

	values(): Value[] {
		return Array.from(this.cache.values());
	}

	getValueKey(deviceId: string, measurementId: string): string {
		return `${deviceId}-${measurementId}`;
	}
}
