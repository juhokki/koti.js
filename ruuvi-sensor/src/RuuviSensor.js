import fetch from "node-fetch";

class RuuviSensor {

	constructor(options) {
		this.settings = options.settings;
		this.writeBuffer = this.settings.writeBuffer.enabled ? this.createWriteBuffer() : null;
	}

	createWriteBuffer() {
		return new WriteBuffer(this.settings.writeBuffer.interval, this.write.bind(this));
	}

	getWriteBuffer() {
		return this.writeBuffer;
	}

	async start() {
		const { "default": Ruuvi } = await import("node-ruuvitag");

		Ruuvi.on("found", (tag) => this.onRuuviTagFound(tag));

		Ruuvi.on("warning", (message) => this.onRuuviWarning(message));

		if (this.writeBuffer) {
			this.writeBuffer.start();
		}
	}

	stop() {
		if (this.writeBuffer) {
			this.writeBuffer.stop();
		}
	}

	onRuuviTagFound(tag) {
		console.log(`Discovered Ruuvi device with id ${tag.id}.`);

		tag.on("updated", (data) => this.onTagUpdated(tag.id, data));
	}

	onRuuviWarning(message) {
		console.log(message);
	}

	onTagUpdated(tagId, data) {
		const time = Date.now(); 
		const values = [
			new Value(tagId, "temperature", Number(Number(data.temperature).toFixed(1)), 1, time),
			new Value(tagId, "humidity", Number(Number(data.humidity).toFixed(1)), 1, time),
			new Value(tagId, "pressure", Number(Number(data.pressure * 0.001).toFixed(3)), 3, time),
			new Value(tagId, "battery", Number(Number(data.battery * 0.001).toFixed(2)), 2, time)
		];

		if (this.writeBuffer) {
			return Promise.resolve(this.writeBuffer.buffer(values));
		} else {
			return this.write(values);
		}
	}

	write(values) {
		const url = `${this.settings.url}/api/values`;
		const username = this.settings.api.username;
		const password = this.settings.api.password;
		const basic = Buffer.from(`${username}:${password}`).toString("base64");
		const options = {
			"method": "POST",
			"headers": {
				"Content-Type": "application/json",
				"Authorization": `Basic ${basic}`
			},
			"body": JSON.stringify(values)
		};

		return this.sendRequest(url, options);
	}

	async sendRequest(url, options) {
		try {
			await fetch(url, options);

			// TODO: Debug logging
			//console.log(`Sent ${values.length} values to remote host.`);
		} catch (error) {
			console.log("Failed to send values to remote host.", error);
		}
	}

}

class WriteBuffer {

	interval = null;
	callback = null;
	cache = new Map();

	constructor(interval, callback) {
		this.interval = interval;
		this.callback = callback;
	}

	start() {
		this.intervalId = setInterval(async () => { 
			await this.write(); 
		}, this.interval);
	}

	async stop() {
		clearInterval(this.intervalId);
		await this.write();
	}

	getCache() {
		return this.cache;
	}

	buffer(values) {
		values.forEach((value) => {
			const cacheKey = `${value.deviceId}-${value.measurementId}`;

			if (this.cache.has(cacheKey)) {
				this.cache.get(cacheKey).push(value);
			} else {
				this.cache.set(cacheKey, [value]);
			}
		});
	}

	async write() {
		const values = [];

		this.cache.forEach((measurementValues) => {
			const deviceId = measurementValues[0].deviceId;
			const measurementId = measurementValues[0].measurementId;
			const measValues = [];
			const times = [];

			measurementValues.forEach((value) => {
				measValues.push(value.value);
				times.push(value.time);
			});

			const decimals = measurementValues[0].decimals;
			const value = Number((measValues.reduce((a, b) => a + b) / measValues.length).toFixed(decimals));
			const time = Math.round(times.reduce((a, b) => a + b) / times.length);
			const averageValue = new Value(deviceId, measurementId, value, decimals, time);

			values.push(averageValue);
		});

		if (values.length > 0) {
			await this.callback(values);
		}

		this.cache.clear();
	}

}

class Value {

	constructor(deviceId, measurementId, value, decimals, time) {
		this.deviceId = deviceId;
		this.measurementId = measurementId;
		this.value = value;
		this.decimals = decimals;
		this.time = time;
	}

}

export { RuuviSensor, WriteBuffer, Value };