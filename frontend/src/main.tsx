import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import registerServiceWorker from "./registerServiceWorker";
import App from "./components/App";

const app = document.getElementById("app");

if (!app) {
	throw new Error("Missing #app");
}

const root = ReactDOM.createRoot(app);

root.render(
	<React.StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</React.StrictMode>
);

registerServiceWorker();
