const MeasurementType = {
	Number: "number",
	String: "string",
	Boolean: "boolean",
	Counter: "counter"
} as const;

type MeasurementType = (typeof MeasurementType)[keyof typeof MeasurementType];

export default MeasurementType;
