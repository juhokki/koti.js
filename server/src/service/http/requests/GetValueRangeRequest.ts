import type { AuthenticatedRequest } from "./AuthenticatedRequest.ts";

export interface GetValueRangeRequestParams {
	deviceId: "string";
}

export interface GetValueRangeRequestQuery {
	startTime: string;
	endTime: string;
}

export type GetValueRangeRequest = AuthenticatedRequest<
	GetValueRangeRequestParams,
	object,
	object,
	GetValueRangeRequestQuery,
	Record<string, unknown>
>;
