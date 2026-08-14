import type Value from "../../../model/Value.ts";
import type { AuthenticatedRequest } from "./AuthenticatedRequest.ts";

export type PostValuesRequestBody = Value[];

export type PostValuesRequest = AuthenticatedRequest<
	object,
	object,
	PostValuesRequestBody,
	object,
	Record<string, unknown>
>;
