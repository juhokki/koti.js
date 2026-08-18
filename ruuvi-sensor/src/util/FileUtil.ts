import { readFileSync } from "fs";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function readConfigFile<T>(file: string): T {
	return JSON.parse(readFileSync(file, "utf-8")) as T;
}

export { readConfigFile };
