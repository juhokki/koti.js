import { readFileSync, writeFileSync } from "fs";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function readConfigFile<T>(file: string): T {
	return JSON.parse(readFileSync(file, "utf-8")) as T;
}

function writeConfigFile(file: string, data: string): void {
	writeFileSync(file, data);
}

export { readConfigFile, writeConfigFile };
