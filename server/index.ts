import path from "path";
import Koti from "./src/Koti.js";

const koti = new Koti(path.resolve("conf"));

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
