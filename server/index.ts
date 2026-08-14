import path from "path";
import logger from "./src/util/logger.js";
import Koti from "./src/Koti.js";

const configDir = path.resolve("conf");
const koti = new Koti(configDir);

function onInterrupt() {
	koti.stop()
		.then(() => {
			process.exit(0);
		})
		.catch((e: unknown) => {
			logger.error(e, "A problem occurred while stopping Koti.");
			process.exit(1);
		});
}

process.on("SIGINT", () => {
	onInterrupt();
});

process.on("SIGTERM", () => {
	onInterrupt();
});

koti.start().catch((e: unknown) => {
	logger.error(e, "A problem occurred while starting Koti.");
	process.exit(1);
});
