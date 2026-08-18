import path from "path";
import { RuuviSensor } from "./src/RuuviSensor.ts";

const settingsFile = path.resolve("conf", "settings.json");
const sensor = new RuuviSensor(settingsFile);

sensor.start();

process.on("SIGINT", () => {
	stop();
});
process.on("SIGTERM", () => {
	stop();
});

function stop() {
	sensor.stop();
	process.exit();
}
