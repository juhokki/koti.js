import type { Request } from "express";
import type UserPayload from "../../user/UserPayload.js";

export interface AuthenticatedRequest<
	T1,
	T2,
	T3,
	T4,
	T5 extends Record<string, unknown>
> extends Request<T1, T2, T3, T4, T5> {
	user?: UserPayload;
}
