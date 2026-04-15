export default class UnconfiguredMeasurementError extends Error {
	constructor() {
		super("Measurement is unconfigured");
	}
}
