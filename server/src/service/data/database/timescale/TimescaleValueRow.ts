export default interface TimescaleValueRow {
	time: string;
	device_id: string;
	measurement_id: string;
	value_number: string | null;
	value_string: string | null;
	value_boolean: boolean | null;
}
