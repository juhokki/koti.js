import type { NextFunction, Response } from "express";
import { expect, test, vi } from "vitest";
import type ServiceBase from "../../src/service/ServiceBase.js";
import ServiceLocator from "../../src/service/ServiceLocator.js";
import createAuthMiddleware from "../../src/service/http/middleware/auth.js";
import type UserService from "../../src/service/user/UserService.js";

const mockVerifyBasic = vi.fn();
const mockVerifyJWT = vi.fn();
const services = new ServiceLocator(
	new Map([
		[
			"UserService",
			{
				verifyBasic: mockVerifyBasic,
				verifyJWT: mockVerifyJWT
			} as unknown as UserService
		]
	] as [string, ServiceBase][])
);
type AuthRequest = Parameters<ReturnType<typeof createAuthMiddleware>>[0];

function executeMiddleware(authorization?: string) {
	const req = {
		headers: authorization ? { authorization } : {}
	} as AuthRequest;
	const status = vi.fn().mockReturnThis();
	const send = vi.fn().mockReturnThis();
	const sendStatus = vi.fn();
	const res = {
		status,
		send,
		sendStatus
	} as unknown as Response;
	const next = vi.fn() as NextFunction;

	createAuthMiddleware(services)(req, res, next);

	return { req, res, next, status, send, sendStatus };
}

test("Rejects requests without an authorization header", () => {
	const { status, send, next } = executeMiddleware();

	expect(status).toHaveBeenCalledWith(401);
	expect(send).toHaveBeenCalledWith("Missing authentication.");
	expect(next).not.toHaveBeenCalled();
});

test("Accepts valid Basic credentials", () => {
	const user = { username: "test", locale: "fi" };
	mockVerifyBasic.mockReturnValueOnce(user);
	const credentials = Buffer.from("test:password").toString("base64");
	const { req, next } = executeMiddleware(`Basic ${credentials}`);

	expect(mockVerifyBasic).toHaveBeenCalledWith("test", "password");
	expect(req.user).toBe(user);
	expect(next).toHaveBeenCalledOnce();
});

test("Rejects malformed Basic credentials", () => {
	const { sendStatus, next } = executeMiddleware("Basic");

	expect(sendStatus).toHaveBeenCalledWith(401);
	expect(next).not.toHaveBeenCalled();
	expect(mockVerifyBasic).not.toHaveBeenCalled();
});

test("Rejects Basic credentials rejected by the user service", () => {
	mockVerifyBasic.mockImplementationOnce(() => {
		throw new Error("Invalid password");
	});
	const credentials = Buffer.from("test:wrong").toString("base64");
	const { sendStatus, next } = executeMiddleware(`Basic ${credentials}`);

	expect(sendStatus).toHaveBeenCalledWith(401);
	expect(next).not.toHaveBeenCalled();
});

test("Accepts a valid Bearer token", () => {
	const user = { username: "test", locale: "fi" };
	mockVerifyJWT.mockReturnValueOnce(user);
	const { req, next } = executeMiddleware("Bearer token");

	expect(mockVerifyJWT).toHaveBeenCalledWith("token");
	expect(req.user).toBe(user);
	expect(next).toHaveBeenCalledOnce();
});

test("Rejects missing or invalid Bearer tokens", () => {
	const missing = executeMiddleware("Bearer");
	mockVerifyJWT.mockImplementationOnce(() => {
		throw new Error("Invalid token");
	});
	const invalid = executeMiddleware("Bearer invalid");

	expect(missing.sendStatus).toHaveBeenCalledWith(401);
	expect(invalid.sendStatus).toHaveBeenCalledWith(401);
	expect(missing.next).not.toHaveBeenCalled();
	expect(invalid.next).not.toHaveBeenCalled();
});

test("Rejects unsupported authentication schemes", () => {
	const { status, send, next } = executeMiddleware("Digest credentials");

	expect(status).toHaveBeenCalledWith(401);
	expect(send).toHaveBeenCalledWith(
		"Unsupported authentication scheme."
	);
	expect(next).not.toHaveBeenCalled();
});