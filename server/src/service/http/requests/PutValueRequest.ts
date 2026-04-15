import type Value from "../../../model/Value.js";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.js";

export type PutValueRequestBody = Value;

export type PutValueRequest = AuthenticatedRequest<
	object,
	object,
	PutValueRequestBody,
	object,
	Record<string, unknown>
>;
