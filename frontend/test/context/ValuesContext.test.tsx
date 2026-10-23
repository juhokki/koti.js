import { useContext, useEffect, useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import * as Messages from "../../src/constants/Messages";
import {
	ValuesContext,
	ValuesContextProvider,
	ValueContextEmitter
} from "../../src/context/ValuesContext";
import type { Value } from "../../src/interface/Value";

const mockSocketOn = vi.hoisted(() => vi.fn());
const mockSocketOff = vi.hoisted(() => vi.fn());

vi.mock("../../src/socket", () => ({
	default: {
		on: mockSocketOn,
		off: mockSocketOff
	}
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

test("Stores values and notifies then removes listeners", () => {
	const emitter = new ValueContextEmitter();
	const listener = vi.fn();
	const value = {
		deviceId: "device-1",
		measurementId: "temperature",
		value: 20,
		time: 1
	} satisfies Value;

	expect(emitter.isInitialized()).toBe(false);
	expect(emitter.get("missing")).toBeUndefined();
	emitter.set("device-1-temperature", value);
	expect(emitter.get("device-1-temperature")).toBe(value);

	emitter.on("device-1-temperature", listener);
	emitter.set("device-1-temperature", value);
	expect(listener).toHaveBeenCalledWith(value);

	emitter.off("device-1-temperature", listener);
	emitter.set("device-1-temperature", value);
	expect(listener).toHaveBeenCalledTimes(1);
	emitter.setInitialized();
	expect(emitter.isInitialized()).toBe(true);
});

test("Rejects removing a listener from an unknown topic or listener", () => {
	const emitter = new ValueContextEmitter();

	expect(() => {
		emitter.off("missing", vi.fn());
	}).toThrow(
		"Topic is not registered"
	);
	emitter.on("topic", vi.fn());
	expect(() => {
		emitter.off("topic", vi.fn());
	}).toThrow(
		"Topic has no listener"
	);
});

function ValuesConsumer() {
	const { values } = useContext(ValuesContext);
	const [display, setDisplay] = useState("empty");
	const key = "device-1-temperature";

	useEffect(() => {
		const listener = (value: Value) => {
			setDisplay(String(value.value));
		};
		values.on(key, listener);
		return () => {
			values.off(key, listener);
		};
	}, [values]);

	return <span data-testid="current-value">{display}</span>;
}

test("Initializes once, accepts newer updates, ignores stale updates, and cleans up", () => {
	const callbacks = new Map<string, (...args: unknown[]) => void>();
	mockSocketOn.mockImplementation(
		(event: string, callback: (...args: unknown[]) => void) => {
			callbacks.set(event, callback);
		}
	);
	const initialValue = {
		deviceId: "device-1",
		measurementId: "temperature",
		value: 20,
		time: 100
	} satisfies Value;

	const { unmount } = render(
		<ValuesContextProvider>
			<ValuesConsumer />
		</ValuesContextProvider>
	);
	const initialValues = callbacks.get(Messages.VALUES);
	const updateValue = callbacks.get(Messages.VALUE_UPDATED);
	expect(initialValues).toBeDefined();
	expect(updateValue).toBeDefined();

	act(() => {
		initialValues?.([initialValue]);
	});
	expect(screen.getByTestId("current-value").textContent).toBe("20");

	act(() => {
		initialValues?.([{ ...initialValue, value: 25, time: 200 }]);
	});
	expect(screen.getByTestId("current-value").textContent).toBe("20");
	act(() => {
		updateValue?.("device-1", "temperature", {
			...initialValue,
			value: 18,
			time: 90
		});
	});
	expect(screen.getByTestId("current-value").textContent).toBe("20");
	act(() => {
		updateValue?.("device-1", "temperature", {
			...initialValue,
			value: 21,
			time: 110
		});
	});
	expect(screen.getByTestId("current-value").textContent).toBe("21");

	unmount();
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.VALUES);
	expect(mockSocketOff).toHaveBeenCalledWith(Messages.VALUE_UPDATED);
});