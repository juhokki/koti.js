import fetch from "node-fetch";
import Ruuvi, {
	type RuuviTag,
	type RuuviTagDataFormat,
	type RuuviTagDataFormat2,
	type RuuviTagDataFormat3,
	type RuuviTagDataFormat5,
	type RuuviTagDataFormat6
} from "node-ruuvitag";
import { readConfigFile } from "./util/FileUtil.ts";
import type RuuviSensorSettings from "./RuuviSensorSettings.ts";
import logger from "./util/logger.ts";

class RuuviSensor {
	settings: RuuviSensorSettings;
	writeBuffer: WriteBuffer | null;

	constructor(settingsFile: string) {
		this.settings = readConfigFile<RuuviSensorSettings>(settingsFile);
		this.writeBuffer = this.settings.writeBuffer.enabled
			? this.createWriteBuffer()
			: null;
	}

	createWriteBuffer() {
		return new WriteBuffer(
			this.settings.writeBuffer.interval,
			this.write.bind(this)
		);
	}

	getWriteBuffer() {
		return this.writeBuffer;
	}

	start() {
		logger.info("Starting Ruuvi sensor.");

		Ruuvi.start();

		Ruuvi.on("found", (tag: RuuviTag) => {
			this.onRuuviTagFound(tag);
		});

		Ruuvi.on("warning", (warning: string) => {
			this.onRuuviWarning(warning);
		});

		if (this.writeBuffer) {
			this.writeBuffer.start();
		}
	}

	stop() {
		logger.info("Stopping Ruuvi sensor.");

		Ruuvi.stop();

		if (this.writeBuffer) {
			this.writeBuffer.stop().catch((error: unknown) => {
				logger.error(error, "Failed to write buffered values.");
			});
		}
	}

	onRuuviTagFound(tag: RuuviTag) {
		logger.debug(`Discovered Ruuvi device with id ${tag.id}.`);

		tag.on("updated", (data) => {
			this.onTagUpdated(tag.id, data).catch((error: unknown) => {
				logger.error(error, "Failed to handle tag update.");
			});
		});
	}

	onRuuviWarning(warning: string) {
		logger.warn(warning);
	}

	onTagUpdated(tagId: string, data: RuuviTagDataFormat): Promise<void> {
		if (typeof data.dataFormat === "undefined") {
			// Skip messages without dataFormat.
			return Promise.resolve();
		}

		const values = this.parseRuuviTagData(tagId, data);

		if (values.length === 0) {
			logger.warn("No value attribute was recognized, skipping value.");
			return Promise.resolve();
		}

		if (this.writeBuffer) {
			this.writeBuffer.buffer(values);
			return Promise.resolve();
		} else {
			return this.write(values);
		}
	}

	parseRuuviTagData(tagId: string, data: RuuviTagDataFormat): Value[] {
		const values: Value[] = [];
		const time = Date.now();

		switch (data.dataFormat) {
			case 2: {
				const dataWithFormat2 = data as RuuviTagDataFormat2;
				values.push(
					new Value(
						tagId,
						"temperature",
						Number(dataWithFormat2.temperature.toFixed(1)),
						1,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"humidity",
						Number(dataWithFormat2.humidity.toFixed(1)),
						1,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"pressure",
						Number((dataWithFormat2.pressure * 0.001).toFixed(3)),
						3,
						time
					)
				);
				break;
			}
			case 3: {
				const dataWithFormat3 = data as RuuviTagDataFormat3;
				values.push(
					new Value(
						tagId,
						"temperature",
						Number(dataWithFormat3.temperature.toFixed(1)),
						1,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"humidity",
						Number(dataWithFormat3.humidity.toFixed(1)),
						1,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"pressure",
						Number((dataWithFormat3.pressure * 0.001).toFixed(3)),
						3,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"battery",
						Number((dataWithFormat3.battery * 0.001).toFixed(2)),
						2,
						time
					)
				);
				break;
			}
			case 4: {
				const dataWithFormat4 = data as RuuviTagDataFormat2;
				values.push(
					new Value(
						tagId,
						"temperature",
						Number(dataWithFormat4.temperature.toFixed(1)),
						1,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"humidity",
						Number(dataWithFormat4.humidity.toFixed(1)),
						1,
						time
					)
				);
				values.push(
					new Value(
						tagId,
						"pressure",
						Number((dataWithFormat4.pressure * 0.001).toFixed(3)),
						3,
						time
					)
				);
				break;
			}
			case 5: {
				const dataWithFormat5 = data as RuuviTagDataFormat5;
				if (dataWithFormat5.temperature !== null)
					values.push(
						new Value(
							tagId,
							"temperature",
							Number(dataWithFormat5.temperature.toFixed(1)),
							1,
							time
						)
					);
				if (dataWithFormat5.humidity !== null)
					values.push(
						new Value(
							tagId,
							"humidity",
							Number(dataWithFormat5.humidity.toFixed(1)),
							1,
							time
						)
					);
				if (dataWithFormat5.pressure !== null)
					values.push(
						new Value(
							tagId,
							"pressure",
							Number(
								(dataWithFormat5.pressure * 0.001).toFixed(3)
							),
							3,
							time
						)
					);
				if (dataWithFormat5.battery !== null)
					values.push(
						new Value(
							tagId,
							"battery",
							Number(
								(dataWithFormat5.battery * 0.001).toFixed(2)
							),
							2,
							time
						)
					);
				break;
			}
			case 6: {
				const dataWithFormat6 = data as RuuviTagDataFormat6;
				if (dataWithFormat6.temperature !== null)
					values.push(
						new Value(
							tagId,
							"temperature",
							Number(dataWithFormat6.temperature.toFixed(1)),
							1,
							time
						)
					);
				if (dataWithFormat6.humidity !== null)
					values.push(
						new Value(
							tagId,
							"humidity",
							Number(dataWithFormat6.humidity.toFixed(1)),
							1,
							time
						)
					);
				if (dataWithFormat6.pressure !== null)
					values.push(
						new Value(
							tagId,
							"pressure",
							Number(
								(dataWithFormat6.pressure * 0.001).toFixed(3)
							),
							3,
							time
						)
					);
				if (dataWithFormat6.pm25 !== null)
					values.push(
						new Value(
							tagId,
							"pm25",
							Number(dataWithFormat6.pm25.toFixed(1)),
							1,
							time
						)
					);
				if (dataWithFormat6.co2 !== null)
					values.push(
						new Value(
							tagId,
							"co2",
							Number(dataWithFormat6.co2.toFixed(0)),
							0,
							time
						)
					);
				if (dataWithFormat6.voc !== null)
					values.push(
						new Value(
							tagId,
							"voc",
							Number(dataWithFormat6.voc.toFixed(0)),
							0,
							time
						)
					);
				if (dataWithFormat6.nox !== null)
					values.push(
						new Value(
							tagId,
							"nox",
							Number(dataWithFormat6.nox.toFixed(0)),
							0,
							time
						)
					);
				break;
			}
			default:
				logger.warn(
					`Unrecognized data format ${data.dataFormat.toString()}. Skipping value.`
				);
		}

		logger.debug(
			{ values },
			`Parsed ${values.length.toString()} values from Ruuvi device with id ${tagId}.`
		);

		return values;
	}

	async write(values: Value[]) {
		const url = `${this.settings.url}/api/values`;
		const username = this.settings.api.username;
		const password = this.settings.api.password;
		const basic = Buffer.from(`${username}:${password}`).toString("base64");
		const options = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${basic}`
			},
			body: JSON.stringify(values)
		};

		try {
			await fetch(url, options);

			logger.debug(
				`Sent ${values.length.toString()} values to remote host.`
			);
		} catch (error) {
			logger.error(error, "Failed to send values to remote host.");
		}
	}
}

class WriteBuffer {
	interval: number;
	intervalId: NodeJS.Timeout | undefined;
	callback: (values: Value[]) => Promise<void>;
	cache = new Map<string, Value[]>();

	constructor(
		interval: number,
		callback: (values: Value[]) => Promise<void>
	) {
		this.interval = interval;
		this.callback = callback;
	}

	start() {
		this.intervalId = setInterval(() => {
			this.write().catch((error: unknown) => {
				logger.error(error, "Failed to write WriteBuffer values.");
			});
		}, this.interval);
	}

	async stop() {
		clearInterval(this.intervalId);
		await this.write();
	}

	getCache() {
		return this.cache;
	}

	buffer(values: Value[]) {
		values.forEach((value) => {
			const cacheKey = `${value.deviceId}-${value.measurementId}`;

			if (this.cache.has(cacheKey)) {
				this.cache.get(cacheKey)?.push(value);
			} else {
				this.cache.set(cacheKey, [value]);
			}
		});
	}

	async write() {
		const values: Value[] = [];

		this.cache.forEach((measurementValues) => {
			if (typeof measurementValues[0] === "undefined") {
				logger.warn("Measurement values are undefined. Skipping.");
				return;
			}

			const deviceId = measurementValues[0].deviceId;
			const measurementId = measurementValues[0].measurementId;
			const measValues: number[] = [];
			const times: number[] = [];

			measurementValues.forEach((value) => {
				measValues.push(value.value);
				times.push(value.time);
			});

			const decimals = measurementValues[0].decimals;
			const value = Number(
				(
					measValues.reduce((a, b) => a + b) / measValues.length
				).toFixed(decimals)
			);
			const time = Math.round(
				times.reduce((a, b) => a + b) / times.length
			);
			const averageValue = new Value(
				deviceId,
				measurementId,
				value,
				decimals,
				time
			);

			values.push(averageValue);
		});

		if (values.length > 0) {
			await this.callback(values);
		}

		this.cache.clear();
	}
}

class Value {
	deviceId: string;
	measurementId: string;
	value: number;
	decimals: number;
	time: number;

	constructor(
		deviceId: string,
		measurementId: string,
		value: number,
		decimals: number,
		time: number
	) {
		this.deviceId = deviceId;
		this.measurementId = measurementId;
		this.value = value;
		this.decimals = decimals;
		this.time = time;
	}
}

export { RuuviSensor, WriteBuffer, Value };
