import type Value from "../../../model/Value.js";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.js";

export type PostValuesRequestBody = Value[];

export type PostValuesRequest = AuthenticatedRequest<
	object,
	object,
	PostValuesRequestBody,
	object,
	Record<string, unknown>
>;
