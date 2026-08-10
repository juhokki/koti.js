"use strict";

/* eslint-env browser, serviceworker */

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("push", (event) => {
	const json = event.data.json();
	const title = json.title;
	const body = json.body;

	self.registration.showNotification(title, { body });
});

self.addEventListener("notificationclick", function (event) {
	event.notification.close();
	event.waitUntil(clients.openWindow("/"));
});
