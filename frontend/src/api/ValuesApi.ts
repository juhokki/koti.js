import AuthUtil from "../util/AuthUtil";
import { MeasurementValue } from "../interface/MeasurementValue";
import { ValueType } from "../interface/Value";

class ValuesApi {
	control(deviceId: string, measurementId: string, value: ValueType) {
		const url = "/api/values";
		const options = {
			method: "PUT",
			headers: {
				Authorization: AuthUtil.buildAuthorization(),
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ deviceId, measurementId, value })
		};

		return fetch(url, options);
	}

	async getDeviceValues(
		deviceId: string,
		startTime: number,
		endTime: number
	): Promise<MeasurementValue[]> {
		const url = `/api/values/${deviceId}?startTime=${startTime.toString()}&endTime=${endTime.toString()}`;
		const options = {
			method: "GET",
			headers: {
				Authorization: AuthUtil.buildAuthorization()
			}
		};

		const response = await fetch(url, options);

		return await response.json() as MeasurementValue[];
	}
}

export default new ValuesApi();
