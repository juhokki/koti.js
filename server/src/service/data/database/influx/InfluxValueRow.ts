export default interface InfluxValueRow {
	time: Date;
	device_id: string;
	measurement_id: string;
	value_number: number | null;
	value_string: string | null;
	value_boolean: boolean | null;
}
