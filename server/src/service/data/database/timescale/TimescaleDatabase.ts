import pg from "pg";
import format from "pg-format";
import type Database from "../Database.ts";
import Value from "../../../../model/Value.ts";
import type TimescaleDatabaseSettings from "./TimescaleDatabaseSettings.ts";
import type TimescaleValueRow from "./TimescaleValueRow.ts";
import type ValueType from "../../../../types/ValueType.ts";

export const TABLE_VALUES = "values";

export default class TimescaleDatabase implements Database {
	client: pg.Client;
	options: TimescaleDatabaseSettings;

	constructor(options: TimescaleDatabaseSettings) {
		this.options = options;

		this.client = new pg.Client({
			host: this.options.host,
			port: this.options.port,
			database: this.options.database,
			user: this.options.user,
			password: this.options.password
		});
	}

	async start() {
		await this.client.connect();
		await this.createTablesIfNotExists();
	}

	async stop() {
		await this.client.end();
	}

	async createTablesIfNotExists() {
		const query = format(
			`CREATE TABLE IF NOT EXISTS %I (
				time TIMESTAMPTZ NOT NULL,
				device_id TEXT NOT NULL,
				measurement_id TEXT NOT NULL,
				value_number decimal,
				value_string TEXT,
				value_boolean BOOLEAN
			)`,
			TABLE_VALUES
		);

		await this.client.query(query);

		const htQuery = format(
			`SELECT create_hypertable (
				%L, 
				by_range('time'), 
				true, 
				true, 
				false
			)`,
			TABLE_VALUES
		);

		await this.client.query(htQuery);
	}

	async readLatestValues() {
		const query = format(
			`SELECT * FROM (
				SELECT DISTINCT ON (device_id, measurement_id) * 
				FROM %I 
				ORDER BY device_id, measurement_id, time DESC
			) v 
			ORDER BY time DESC`,
			TABLE_VALUES
		);

		const result = await this.client.query<TimescaleValueRow>(query);

		return result.rows.map((row) => {
			return new Value(
				row.device_id,
				row.measurement_id,
				this.getRowValue(row),
				new Date(row.time).getTime()
			);
		});
	}

	async readValueRange(deviceId: string, startTime: number, endTime: number) {
		const query = format(
			`SELECT * FROM %I
			WHERE device_id = %L
			AND time >= %L
			AND time <= %L
			ORDER BY time DESC`,
			TABLE_VALUES,
			deviceId,
			new Date(startTime),
			new Date(endTime)
		);

		const result = await this.client.query<TimescaleValueRow>(query);

		return result.rows.map((row) => {
			return new Value(
				row.device_id,
				row.measurement_id,
				this.getRowValue(row),
				new Date(row.time).getTime()
			);
		});
	}

	async write(values: Value[]) {
		const query = format(
			`INSERT INTO %I 
			(time, device_id, measurement_id, value_number, value_string, value_boolean)
			VALUES %L`,
			TABLE_VALUES,
			values.map((value) => {
				return [
					new Date(value.time),
					value.deviceId,
					value.measurementId,
					typeof value.value === "number" ? value.value : null,
					typeof value.value === "string" ? value.value : null,
					typeof value.value === "boolean" ? value.value : null
				];
			})
		);

		await this.client.query(query);
	}

	getRowValue(row: TimescaleValueRow): ValueType {
		if (row.value_number !== null) {
			// TODO: Decimal type can be to big for js Number.
			return Number(row.value_number);
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
