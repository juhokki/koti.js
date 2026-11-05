import ServiceBase from "../ServiceBase.ts";
import Asset from "../../model/Asset.ts";
import Device from "../../model/Device.ts";
import Measurement from "../../model/Measurement.ts";
import DeviceOnlineStatus from "../../constants/DeviceOnlineStatus.ts";
import * as Messages from "../../constants/Messages.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type AssetServiceSettings from "./AssetServiceSettings.ts";
import type DeviceConfig from "./DeviceConfig.ts";
import type AssetConfig from "./AssetConfig.ts";
import type DeviceType from "../../constants/DeviceType.ts";
import { readConfigFile } from "../../util/FileUtil.ts";
import logger from "../../util/logger.ts";
import type ServiceParameter from "../ServiceParameter.ts";

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

	override getParameters(): ServiceParameter[] {
		return [
			{ name: "Assets count", value: this.assets.length },
			{ name: "Devices count", value: this.devices.length },
			{ name: "Measurements count", value: this.getMeasurements().length }
		];
	}

	validate() {
		this.deviceIdMustBeUnique();
		this.assetIdMustBeUnique();
		this.linkedAssetsMustExist();
		this.assetsMustNotContainCycles();
	}

	assetIdMustBeUnique() {
		const ids = this.assets.map((asset: Asset) => asset.id);

		if (ids.length !== new Set(ids).size) {
			throw new Error("Duplicate asset id found");
		}
	}

	linkedAssetsMustExist() {
		for (const asset of this.assets) {
			for (const linkedAssetId of asset.links) {
				if (!this.assets.some((a: Asset) => a.id === linkedAssetId)) {
					throw new Error(
						`Linked asset "${linkedAssetId}" of asset "${asset.id}" not found.`
					);
				}
			}
		}
	}

	assetsMustNotContainCycles() {
		const done = new Set<string>();

		const visit = (asset: Asset, path: string[]) => {
			if (path.includes(asset.id)) {
				throw new Error(
					`Asset cycle found: ${[...path, asset.id].join(" -> ")}`
				);
			}

			if (done.has(asset.id)) {
				return;
			}

			for (const linkedAssetId of asset.links) {
				visit(this.getAsset(linkedAssetId), [...path, asset.id]);
			}

			done.add(asset.id);
		};

		for (const asset of this.assets) {
			visit(asset, []);
		}
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
						measurementConfig.schedules,
						measurementConfig.steps
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
				assetConfig.links ?? [],
				assetConfig.devices?.map((deviceId) => this.getDevice(deviceId)) ?? [],
				(assetConfig.summary && {
					devices: assetConfig.summary.devices.map(
						({ id, name, measurements }) => ({
							device: this.getDevice(id),
							displayName: name,
							measurements: measurements.map((measurementId) =>
								this.getMeasurement(id, measurementId)
							)
						})
					)
				}) ?? null
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
