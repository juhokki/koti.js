import { ValueType } from "./Value";

export interface DeviceChartData {
	measurementId: string;
	data: DeviceChartDataObject;
}

export interface DeviceChartDataObject {
	datasets: [DeviceChartDataSet];
}

export interface DeviceChartDataSet {
	data: DeviceChartDataPoint[];
}

export interface DeviceChartDataPoint {
	x: Date;
	y: ValueType;
}
