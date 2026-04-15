class ValueUtil {
	createValueKey(deviceId: string, measurementId: string) {
		return `${deviceId}-${measurementId}`;
	}
}

export default new ValueUtil();
