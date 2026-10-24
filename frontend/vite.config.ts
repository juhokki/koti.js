import process from "process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());

	return {
		build: {
			outDir: "dist",
			rolldownOptions: {
				output: {
					codeSplitting: {
						groups: [
							{
								name: "react-vendor",
								test: /node_modules[\\/]react/,
								priority: 20
							},
							{
								name: "vendor",
								test: /node_modules/,
								priority: 10
							},
							{
								name: "app",
								priority: 5
							}
						]
					}
				}
			}
		},
		plugins: [react()],
		server: {
			port: 3001,
			proxy: {
				"/user/login": {
					target: env.VITE_API_BASE_URL,
					changeOrigin: true,
					secure: false
				},
				"/api": {
					target: env.VITE_API_BASE_URL,
					changeOrigin: true,
					secure: false
				},
				"/socket": {
					target: env.VITE_API_BASE_URL,
					changeOrigin: true,
					secure: false,
					ws: true
				}
			}
		}
	};
});
