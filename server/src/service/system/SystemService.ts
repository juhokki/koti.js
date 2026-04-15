import checkDiskSpace from "check-disk-space";
import { fileURLToPath } from "url";
import ServiceBase from "../ServiceBase.js";
import Disk from "../../model/Disk.js";
import type SystemServiceSettings from "./SystemServiceSettings.js";
import type ServiceLocator from "../ServiceLocator.js";

export default class SystemService extends ServiceBase {
	options: SystemServiceSettings;

	constructor(services: ServiceLocator, options: SystemServiceSettings) {
		super(services);

		this.options = options;
	}

	async getDisk() {
		const filePath = fileURLToPath(import.meta.url);
		const checkDiskSpaceFunc = checkDiskSpace as unknown as (
			directoryPath: string
		) => Promise<checkDiskSpace.DiskSpace>;
		const diskSpace = await checkDiskSpaceFunc(filePath);

		return new Disk(diskSpace.size, diskSpace.free);
	}
}
