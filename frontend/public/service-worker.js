"use strict";

/* eslint-env browser, serviceworker */

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("push", (event) => {
	const alarm = event.data.json();
	const title = `${alarm.assetName}/${alarm.measurementName}`;
	const body = alarm.name;

	self.registration.showNotification(title, { body });
});

self.addEventListener("notificationclick", function (event) {
	event.notification.close();
	event.waitUntil(clients.openWindow("/alarms/"));
});
