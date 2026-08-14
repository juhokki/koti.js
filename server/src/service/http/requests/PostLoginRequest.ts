import type { AuthenticatedRequest } from "./AuthenticatedRequest.ts";

export interface PostLoginRequestBody {
	username: string;
	password: string;
}

export type PostLoginRequest = AuthenticatedRequest<
	object,
	object,
	PostLoginRequestBody,
	object,
	Record<string, unknown>
>;
