import jwt from "jsonwebtoken";
import { type PushSubscription } from "web-push";
import crypto from "crypto";
import ServiceBase from "../ServiceBase.ts";
import User from "../../model/User.ts";
import type UserServiceSettings from "./UserServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import type UserPayload from "./UserPayload.ts";
import type UserConfig from "./UserConfig.ts";
import { readConfigFile, writeConfigFile } from "../../util/FileUtil.ts";
import logger from "../../util/logger.ts";

export default class UserService extends ServiceBase {
	options: UserServiceSettings;
	users: User[];

	constructor(services: ServiceLocator, options: UserServiceSettings) {
		super(services);

		this.options = options;
		this.users = this.readUsersFromFile();
	}

	readUsersFromFile(): User[] {
		const config = readConfigFile<UserConfig[]>(this.options.file);

		return config.map((userConfig) => {
			return new User(
				userConfig.username,
				userConfig.hash,
				userConfig.locale,
				userConfig.subscriptions
			);
		});
	}

	getUsers(): User[] {
		return this.users;
	}

	authenticate(username: string, password: string): string {
		if (!username || !password) {
			throw new Error("Missing credentials.");
		}

		const user = this.getUser(username);

		if (user) {
			const passwordHash = this.createPasswordHash(
				password,
				this.getSecret()
			);

			if (user.hash === passwordHash) {
				const payload = {
					username: user.username,
					locale: user.locale
				} satisfies UserPayload;

				return jwt.sign(payload, this.getSecret(), {
					expiresIn: this.options.tokenExpiration
				});
			}
		}

		throw new Error("Authentication failed.");
	}

	createPasswordHash(password: string, secret: string): string {
		return crypto
			.pbkdf2Sync(password, secret, 1000, 64, "sha512")
			.toString("hex");
	}

	verifyJWT(token: string): UserPayload {
		const decoded = jwt.verify(token, this.getSecret()) as UserPayload;
		const user = this.getUser(decoded.username);

		if (user) {
			return {
				username: user.username,
				locale: user.locale
			} satisfies UserPayload;
		} else {
			throw new Error(
				`Token was verified, but user ${decoded.username} does not exist.`
			);
		}
	}

	verifyBasic(username: string, password: string): UserPayload {
		const user = this.getUser(username);

		if (user) {
			const passwordHash = this.createPasswordHash(
				password,
				this.getSecret()
			);

			if (user.hash === passwordHash) {
				return {
					username: user.username,
					locale: user.locale
				} satisfies UserPayload;
			}
		}

		throw new Error(`Not able to verify user ${username}`);
	}

	getSecret(): string {
		return this.options.secret;
	}

	getUser(username: string): User | null {
		const user = this.getUsers().find((user) =>
			this.compareUsernames(user.username, username)
		);

		if (!user) {
			return null;
		}

		return user;
	}

	getUserHash(username: string): string | null {
		const user = this.getUsers().find((user) =>
			this.compareUsernames(user.username, username)
		);

		if (!user) {
			return null;
		}

		return user.hash;
	}

	compareUsernames(a: string, b: string): boolean {
		return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
	}

	getUserSubscriptionStatus(
		username: string,
		subscription: PushSubscription
	): boolean {
		const user = this.getUser(username);

		if (!user) {
			throw new Error("User not found");
		}

		const userSub = user.subscriptions.find(
			(s) => JSON.stringify(s) === JSON.stringify(subscription)
		);

		return !!userSub;
	}

	addUserSubscription(
		username: string,
		subscription: PushSubscription
	): void {
		const user = this.getUser(username);

		if (!user) {
			throw new Error("User not found");
		}

		this.services.getPushApiService().addSubscription(subscription);
		user.subscriptions.push(subscription);
		this.saveUserChanges();
	}

	deleteUserSubscription(
		username: string,
		subscription: PushSubscription
	): void {
		const user = this.getUser(username);

		if (!user) {
			throw new Error("User not found");
		}

		const userSub = user.subscriptions.find(
			(s) => JSON.stringify(s) === JSON.stringify(subscription)
		);

		if (userSub) {
			this.services.getPushApiService().removeSubscription(userSub);
			user.subscriptions.splice(user.subscriptions.indexOf(userSub), 1);
			this.saveUserChanges();
		} else {
			logger.warn("Unable to find user subscription.");
		}
	}

	saveUserChanges(): void {
		try {
			const userData = JSON.stringify(this.getUsers(), null, "\t");
			writeConfigFile(this.options.file, userData);

			logger.info("Wrote to users file.");
		} catch (e) {
			logger.error(e, "Failed to save users file.");
		}
	}
}
