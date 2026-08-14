import type Value from "../../../model/Value.ts";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.ts";

export type PutValueRequestBody = Value;

export type PutValueRequest = AuthenticatedRequest<
	object,
	object,
	PutValueRequestBody,
	object,
	Record<string, unknown>
>;
