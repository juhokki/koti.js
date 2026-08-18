import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default defineConfig((configEnv) =>
	mergeConfig(
		viteConfig(configEnv),
		defineConfig({
			test: {
				environment: "jsdom",
				clearMocks: true,
				coverage: {
					provider: "istanbul",
					include: ["src/"]
				}
			}
		})
	)
);
