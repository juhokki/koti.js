import crypto from "crypto";
import type ServicesConfig from "../src/service/ServicesConfig.js";
import { readConfigFile } from "../src/util/FileUtil.js";

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
	throw new Error("Incorrect arguments [username, password]");
}

const config = readConfigFile<ServicesConfig>("../conf/services.json");
const userServiceConfig = config.UserService;
const salt = userServiceConfig.secret;
const hash = crypto
	.pbkdf2Sync(password, salt, 1000, 64, "sha512")
	.toString("hex");

console.log(
	"Add created user to users.json",
	JSON.stringify({ username: username, hash: hash }, null, 4)
);
