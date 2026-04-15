import fs from "fs";
import { RuuviSensor } from "./src/RuuviSensor.js";

const settings = JSON.parse(fs.readFileSync("./conf/settings.json"));
const sensor = new RuuviSensor({ settings });

sensor.start();

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

function stop() {
	sensor.stop();
	process.exit();
}
