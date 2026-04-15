import React, { createContext, useEffect, useState } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";
import { Value } from "../interface/Value";
import ValueUtil from "../util/ValueUtil";

interface ValuesContextType {
	values: ValueContextEmitter;
}

const ValuesContext = createContext<ValuesContextType>({} as ValuesContextType);

const ValuesContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [values] = useState(new ValueContextEmitter());
	
	useEffect(() => {
		socket.on(Messages.VALUES, (latestValues: Value[]) => {
			if (!values.isInitialized()) {
				latestValues.forEach((value) => {
					values.set(
						ValueUtil.createValueKey(value.deviceId, value.measurementId),
						value
					)
				});

				values.setInitialized();
			}
		});

		socket.on(
			Messages.VALUE_UPDATED,
			(deviceId: string, measurementId: string, value: Value) => {
				const key = ValueUtil.createValueKey(deviceId, measurementId);
				const prevValue = values.get(key);

				if (prevValue) {
					if (prevValue.time >= value.time) {
						return;
					}
				}

				values.set(key, value);
			}
		);

		return () => {
			socket.off(Messages.VALUES);
			socket.off(Messages.VALUE_UPDATED);
		};
	});

	return (
		<ValuesContext.Provider value={{ values }}>
			{children}
		</ValuesContext.Provider>
	);
};

class ValueContextEmitter {
	initialized = false;
	values = new Map<string, Value>();
	listeners = new Map<string, ((value: Value) => void)[]>();

	isInitialized() {
		return this.initialized;
	}

	setInitialized() {
		this.initialized = true;
	}

	get(key: string): Value | undefined {
		if (this.values.has(key)) {
			return this.values.get(key);
		}
	}

	set(key: string, value: Value) {
		this.values.set(key, value);

		if (this.listeners.has(key)) {
			const listeners = this.listeners.get(key);

			if (listeners) {
				listeners.forEach((listener) => {
					listener(value);
				});
			}
		}
	}

	on(topic: string, listener: (value: Value) => void) {
		if (this.listeners.has(topic)) {
			const listeners = this.listeners.get(topic);

			if (listeners) {
				listeners.push(listener);
			}
		} else {
			this.listeners.set(topic, [listener]);
		}
	}

	off(topic: string, listener: (value: Value) => void) {
		if (this.listeners.has(topic)) {
			const listeners = this.listeners.get(topic);

			if (listeners) {
				const index = listeners.indexOf(listener);

				if (index !== -1) {
					listeners.splice(index, 1);
				} else {
					throw new Error("Topic has no listener");
				}
			}
		} else {
			throw new Error("Topic is not registered");
		}
	}
}

export { ValuesContext, ValuesContextProvider, ValueContextEmitter };
