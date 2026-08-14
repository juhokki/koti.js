import ServiceBase from "../ServiceBase.js";
import Asset from "../../model/Asset.js";
import Device from "../../model/Device.js";
import Measurement from "../../model/Measurement.js";
import DeviceOnlineStatus from "../../enums/DeviceOnlineStatus.js";
import * as Messages from "../../constants/Messages.js";
import type ServiceLocator from "../ServiceLocator.js";
import type AssetServiceSettings from "./AssetServiceSettings.js";
import type DeviceConfig from "./DeviceConfig.js";
import type AssetConfig from "./AssetConfig.js";
import type DeviceType from "../../enums/DeviceType.js";
import { readConfigFile } from "../../util/FileUtil.js";
import logger from "../../util/logger.js";

export default class AssetService extends ServiceBase {
	options: AssetServiceSettings;
	devices: Device[] = [];
	assets: Asset[] = [];

	constructor(services: ServiceLocator, options: AssetServiceSettings) {
		super(services);

		this.options = options;
		this.devices = this.readDevicesFromFile();
		this.assets = this.readAssetsFromFile();
		this.validate();
	}

	validate() {
		this.deviceIdMustBeUnique();
	}

	deviceIdMustBeUnique() {
		const deviceIds = this.devices.map((device: Device) => device.id);
		const uniqueDeviceIds = [...new Set(deviceIds)];

		// Device id must be unique.
		if (deviceIds.length !== uniqueDeviceIds.length) {
			throw new Error("Duplicate device id found");
		}
	}

	readDevicesFromFile(): Device[] {
		const config = readConfigFile<DeviceConfig[]>(this.options.devicesFile);

		return config.map((deviceConfig) => {
			return new Device(
				deviceConfig.id,
				deviceConfig.type,
				deviceConfig.name,
				deviceConfig.icon,
				deviceConfig.measurements.map((measurementConfig) => {
					return new Measurement(
						deviceConfig.id,
						measurementConfig.id,
						measurementConfig.name,
						measurementConfig.type,
						measurementConfig.unit,
						measurementConfig.icon,
						measurementConfig.controllable,
						measurementConfig.min,
						measurementConfig.max,
						measurementConfig.actions,
						measurementConfig.alarms,
						measurementConfig.schedules
					);
				})
			);
		});
	}

	readAssetsFromFile(): Asset[] {
		const config = readConfigFile<AssetConfig[]>(this.options.assetsFile);

		return config.map((assetConfig) => {
			return new Asset(
				assetConfig.id,
				assetConfig.name,
				assetConfig.icon,
				assetConfig.devices.map((deviceId) => this.getDevice(deviceId))
			);
		});
	}

	getAssets(): Asset[] {
		return this.assets;
	}

	getAsset(assetId: string): Asset {
		const asset = this.assets.find((a: Asset) => a.id === assetId);

		if (!asset) {
			throw new Error(`Asset "${assetId}" not found.`);
		}

		return asset;
	}

	getDevices(): Device[] {
		return this.devices;
	}

	getDevicesWithType(deviceType: DeviceType): Device[] {
		return this.devices.filter(
			(device: Device) => device.type === deviceType
		);
	}

	getDevice(deviceId: string): Device {
		const device = this.devices.find(
			(device: Device) => device.id === deviceId
		);

		if (!device) {
			throw new Error(`Device "${deviceId}" not found.`);
		}

		return device;
	}

	getDeviceAsset(deviceId: string): Asset {
		const asset = this.assets.find((asset: Asset) =>
			asset.devices.find((device: Device) => device.id === deviceId)
		);

		if (!asset) {
			throw new Error(`Asset not found for device id "${deviceId}".`);
		}

		return asset;
	}

	getMeasurements(): Measurement[] {
		const measurements = [];

		for (const device of this.getDevices()) {
			for (const measurement of device.measurements) {
				measurements.push(measurement);
			}
		}

		return measurements;
	}

	getDeviceMeasurements(deviceId: string): Measurement[] {
		return this.getDevice(deviceId).measurements;
	}

	getMeasurement(deviceId: string, measurementId: string): Measurement {
		const device = this.getDevice(deviceId);

		for (const measurement of device.measurements) {
			if (measurement.id === measurementId) {
				return measurement;
			}
		}

		throw new Error(`Measurement "${measurementId}" not found.`);
	}

	setDeviceMeasurementDisabledStatus(
		deviceId: string,
		measurementId: string,
		status: boolean
	) {
		const measurement = this.getMeasurement(deviceId, measurementId);

		if (measurement.getDisabled() !== status) {
			logger.info(
				`Setting measurement "${deviceId}/${measurementId}" disabled state to "${status ? "true" : "false"}".`
			);
			measurement.setDisabled(status);
			this.emit(Messages.MEASUREMENT_UPDATED, deviceId, measurementId);
		}
	}

	setDeviceOnlineStatus(deviceId: string, status: DeviceOnlineStatus) {
		const device = this.getDevice(deviceId);

		if (device.getOnlineStatus() !== status) {
			logger.info(
				`Setting device "${deviceId}" online state to "${status}".`
			);
			device.setOnlineStatus(status);
			this.emit(Messages.DEVICE_UPDATED, deviceId);
		}
	}
}
