import express, { type Express } from "express";
import { Socket, Server as SocketIOServer } from "socket.io";
import { authorize, UnauthorizedError } from "@thream/socketio-jwt";
import http, { Server } from "http";
import ServiceBase from "../ServiceBase.js";
import * as Messages from "../../constants/Messages.js";
import getRouter from "./routes/index.js";
import type ServiceLocator from "../ServiceLocator.js";
import type HttpServiceSettings from "./HttpServiceSettings.js";
import type UserPayload from "../user/UserPayload.js";
import type ShoppingList from "../../model/ShoppingList.js";

export default class HttpService extends ServiceBase {
	options: HttpServiceSettings;
	httpServer: Server;
	express: Express;
	sockets: SocketIOServer;

	constructor(services: ServiceLocator, options: HttpServiceSettings) {
		super(services);

		this.options = options;
		this.httpServer = this.setupHttpServer();
		this.express = this.setupExpress();
		this.sockets = this.setupSockets();
	}

	override async start() {
		await new Promise<void>((resolve, reject) => {
			this.httpServer.listen(this.options.port, () => {
				console.log(
					`HTTP server started. Listening at port ${this.options.port.toString()}.`
				);
				resolve();
			});
		});
	}

	override async stop() {
		await this.sockets.close();
		console.log("Socket server closed.");

		await new Promise<void>((resolve) => {
			this.httpServer.close(() => {
				console.log("HTTP server closed.");
				resolve();
			});
		});
	}

	setupHttpServer() {
		return http.createServer((req, res) => {
			this.express(req, res);
		});
	}

	setupExpress() {
		const app = express();
		app.use(getRouter(this.services, this.options));

		return app;
	}

	setupSockets() {
		const sockets = new SocketIOServer(this.httpServer, {
			path: "/socket"
		});

		sockets
			.use(
				authorize({
					secret: this.services.getUserService().getSecret(),
					onAuthentication: (decodedToken: UserPayload) =>
						this.onSocketAuthentication(decodedToken)
				})
			)
			.on("connection", (socket) => {
				this.onSocketConnected(socket);
			});

		this.services
			.getAssetService()
			.on(Messages.DEVICE_UPDATED, (deviceId, measurementId) =>
				this.sockets.sockets.emit(
					Messages.ASSETS,
					this.services.getAssetService().getAssets()
				)
			);

		this.services
			.getAssetService()
			.on(Messages.MEASUREMENT_UPDATED, (deviceId, measurementId) =>
				this.sockets.sockets.emit(
					Messages.ASSETS,
					this.services.getAssetService().getAssets()
				)
			);

		this.services
			.getDataService()
			.on(Messages.VALUE_UPDATED, (deviceId, measurementId, value) =>
				this.sockets.sockets.emit(
					Messages.VALUE_UPDATED,
					deviceId,
					measurementId,
					value
				)
			);

		this.services
			.getShoppingListService()
			.on(Messages.SHOPPINGLIST, (shoppingList) =>
				this.sockets.sockets.emit(Messages.SHOPPINGLIST, shoppingList)
			);

		this.services
			.getAlarmService()
			.on(Messages.ALARMS, (alarms) =>
				this.sockets.sockets.emit(Messages.ALARMS, alarms)
			);

		return sockets;
	}

	onSocketAuthentication(decodedToken: UserPayload) {
		const user = this.services
			.getUserService()
			.getUser(decodedToken.username);

		if (!user) {
			throw new UnauthorizedError("invalid_token", {
				message: `Decoded user ${decodedToken.username} does not exist.`
			});
		}

		return decodedToken;
	}

	onSocketConnected(socket: Socket) {
		socket.emit(Messages.USER, socket.decodedToken as UserPayload);
		socket.emit(
			Messages.ASSETS,
			this.services.getAssetService().getAssets()
		);
		socket.emit(
			Messages.VALUES,
			this.services.getDataService().readLatestValues()
		);
		socket.emit(
			Messages.ALARMS,
			this.services.getAlarmService().getAlarms()
		);
		socket.emit(
			Messages.SHOPPINGLIST,
			this.services.getShoppingListService().getShoppingList()
		);
		socket.on(
			Messages.SHOPPINGLIST,
			(
				shoppingList: ShoppingList,
				callback: (status: number) => void
			) => {
				try {
					this.services
						.getShoppingListService()
						.setShoppingList(shoppingList);
					callback(200);
				} catch (e) {
					callback(500);
				}
			}
		);
	}
}
