export default function registerServiceWorker() {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.register("/service-worker.js", { scope: "/" })
			.catch((e: unknown) => {
				console.error(e);
			});
	}
}
