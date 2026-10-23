import type { ShellyDeviceButton2 } from "shellies";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type AssetService from "../../src/service/asset/AssetService.js";
import type DataService from "../../src/service/data/DataService.js";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import ShellyButton2Handler, {
	BATTERY,
	INPUT_EVENT_COUNTER_0
} from "../../src/service/integration/shelly/devices/ShellyButton2Handler.js";
import UnconfiguredMeasurementError from "../../src/service/integration/shelly/UnconfiguredMeasurementError.js";
import logger from "../../src/util/logger.js";

const mockGetDevice = vi.fn();
const mockWrite = vi.fn();

function createServices() {
	return new ServiceLocator(
		new Map([
			[
				"AssetService",
				{ getDevice: mockGetDevice } as unknown as AssetService
			],
			["DataService", { write: mockWrite } as unknown as DataService]
		] as [string, ServiceBase][])
	);
}

function createButton() {
	let onChange: (prop: string, value: number) => void = () => undefined;
	const device = {
		id: "button-1",
		inputEventCounter0: 3,
		battery: 92,
		on: (_event: string, callback: (prop: string, value: number) => void) => {
			onChange = callback;
		}
	} as unknown as ShellyDeviceButton2;

	return {
		device,
		emitChange: (prop: string, value: number) => {
			onChange(prop, value);
		}
	};
}

function configureMeasurements(...ids: string[]) {
	mockGetDevice.mockReturnValue({
		measurements: ids.map((id) => ({ id }))
	});
}

beforeEach(() => {
	mockGetDevice.mockReset();
	mockWrite.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

test("Writes initial button values and subsequent changes", () => {
	configureMeasurements(INPUT_EVENT_COUNTER_0, BATTERY);
	const button = createButton();
	new ShellyButton2Handler(createServices(), button.device);

	expect(mockWrite).toHaveBeenNthCalledWith(
		1,
		[
			expect.objectContaining({
				deviceId: "button-1",
				measurementId: INPUT_EVENT_COUNTER_0,
				value: 3
			})
		]
	);
	expect(mockWrite).toHaveBeenNthCalledWith(
		2,
		[
			expect.objectContaining({
				deviceId: "button-1",
				measurementId: BATTERY,
				value: 92
			})
		]
	);

	button.emitChange(BATTERY, 87);
	expect(mockWrite).toHaveBeenNthCalledWith(
		3,
		[
			expect.objectContaining({
				measurementId: BATTERY,
				value: 87
			})
		]
	);
});

test("Rejects writes for unconfigured measurements", async () => {
	configureMeasurements(BATTERY);
	const button = createButton();
	const handler = new ShellyButton2Handler(createServices(), button.device);

	await expect(handler.writeValue("unconfigured", 1)).rejects.toBeInstanceOf(
		UnconfiguredMeasurementError
	);
});

test("Silently ignores unconfigured measurement updates", async () => {
	configureMeasurements(BATTERY);
	const button = createButton();
	const errorLog = vi.spyOn(logger, "error").mockImplementation(() => logger);
	const handler = new ShellyButton2Handler(createServices(), button.device);

	handler.onDeviceValueChanged("unconfigured", 1);
	await Promise.resolve();

	expect(errorLog).not.toHaveBeenCalled();
});

test("Logs unexpected errors when a button value write fails", async () => {
	configureMeasurements(INPUT_EVENT_COUNTER_0, BATTERY);
	const button = createButton();
	const error = new Error("Data service unavailable");
	const errorLog = vi.spyOn(logger, "error").mockImplementation(() => logger);
	new ShellyButton2Handler(createServices(), button.device);
	mockWrite.mockRejectedValueOnce(error);

	button.emitChange(BATTERY, 80);
	await vi.waitFor(() => {
		expect(errorLog).toHaveBeenCalledWith(error, "Failed to write values.");
	});
});