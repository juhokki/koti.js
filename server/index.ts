import path from "path";
import Koti from "./src/Koti.js";

const configDir = path.resolve("conf");
const koti = new Koti(configDir);

function onInterrupt() {
	koti.stop()
		.then(() => {
			process.exit(0);
		})
		.catch((e: unknown) => {
			console.log("A problem occurred while stopping Koti.", e);
			process.exit(1);
		});
}

process.on("SIGINT", () => {
	onInterrupt();
});

process.on("SIGTERM", () => {
	onInterrupt();
});

koti.start().catch(() => {
	process.exit(1);
});
