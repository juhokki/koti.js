import Influx, { InfluxDB, FieldType, toNanoDate } from "influx";
import type Database from "../Database.js";
import Value from "../../../../model/Value.js";
import type InfluxDatabaseSettings from "./InfluxDatabaseSettings.js";
import type InfluxValueRow from "./InfluxValueRow.js";
import type ValueType from "../../../../types/ValueType.js";

export const TABLE_VALUES = "valuedata";

export default class InfluxDatabase implements Database {
	influxdb: InfluxDB;
	options: InfluxDatabaseSettings;

	constructor(options: InfluxDatabaseSettings) {
		this.options = options;
		this.influxdb = new InfluxDB({
			host: this.options.host,
			database: this.options.database,
			schema: [
				{
					measurement: TABLE_VALUES,
					tags: ["device_id", "measurement_id"],
					fields: {
						value_number: FieldType.FLOAT,
						value_string: FieldType.STRING,
						value_boolean: FieldType.BOOLEAN
					}
				}
			]
		});
	}

	async start() {
		return Promise.resolve();
	}

	async stop() {
		return Promise.resolve();
	}

	async readLatestValues() {
		const query = `SELECT * FROM ${TABLE_VALUES} 
			GROUP BY device_id,measurement_id 
			ORDER BY time DESC 
			LIMIT 1`;

		const rows = await this.influxdb.query<InfluxValueRow>(query);

		return rows.map((row) => {
			return new Value(
				row.device_id,
				row.measurement_id,
				this.getRowValue(row),
				row.time.getTime()
			);
		});
	}

	async readValueRange(deviceId: string, startTime: number, endTime: number) {
		const startDate = toNanoDate(String(startTime) + "000000");
		const endDate = toNanoDate(String(endTime) + "000000");
		const query = `SELECT * FROM ${TABLE_VALUES} 
			WHERE device_id = ${Influx.escape.stringLit(deviceId)} 
			AND time >= '${startDate.toNanoISOString()}' 
			AND time <= '${endDate.toNanoISOString()}' 
			ORDER BY time DESC`;

		const rows = await this.influxdb.query<InfluxValueRow>(query);

		return rows.map((row) => {
			return new Value(
				row.device_id,
				row.measurement_id,
				this.getRowValue(row),
				row.time.getTime()
			);
		});
	}

	async write(values: Value[]) {
		const points = values.map((value) => {
			return {
				measurement: TABLE_VALUES,
				timestamp: new Date(value.time),
				tags: {
					device_id: value.deviceId,
					measurement_id: value.measurementId
				},
				fields: {
					[this.getValueField(value)]: value.value
				}
			};
		});

		try {
			await this.influxdb.writePoints(points, {
				retentionPolicy: "rp_inf"
			});
		} catch (error) {
			console.log("Failed to write points.", error);
		}
	}

	getValueField(value: Value) {
		if (typeof value.value === "number") {
			return "value_number";
		} else if (typeof value.value === "boolean") {
			return "value_boolean";
		} else if (typeof value.value === "string") {
			return "value_string";
		}

		throw new Error(`Unrecognized value type`);
	}

	getRowValue(row: InfluxValueRow): ValueType {
		if (row.value_number !== null) {
			return row.value_number;
		}

		if (row.value_boolean !== null) {
			return row.value_boolean;
		}

		if (row.value_string !== null) {
			return row.value_string;
		}

		throw new Error(
			`Value type not recognized for row ${JSON.stringify(row)}`
		);
	}
}
