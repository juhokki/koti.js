import checkDiskSpace from "check-disk-space";
import { fileURLToPath } from "url";
import ServiceBase from "../ServiceBase.ts";
import Disk from "../../model/Disk.ts";
import type SystemServiceSettings from "./SystemServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type ServiceParameter from "../ServiceParameter.ts";

export default class SystemService extends ServiceBase {
	options: SystemServiceSettings;

	constructor(services: ServiceLocator, options: SystemServiceSettings) {
		super(services);

		this.options = options;
	}

	override getParameters(): ServiceParameter[] {
		return [{ name: "Uptime (seconds)", value: process.uptime() }];
	}

	async getDisk() {
		const filePath = fileURLToPath(import.meta.url);
		const checkDiskSpaceFunc = checkDiskSpace as unknown as (
			directoryPath: string
		) => Promise<checkDiskSpace.DiskSpace>;
		const diskSpace = await checkDiskSpaceFunc(filePath);

		return new Disk(diskSpace.size, diskSpace.free);
	}

	getUptime() {
		return process.uptime();
	}
}
