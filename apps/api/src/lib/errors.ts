import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"

/** An error that is safe to show to API clients. */
export class ApiError extends HTTPException {
  constructor(
    status: ContentfulStatusCode,
    readonly code: string,
    message: string
  ) {
    super(status, { message })
  }
}

export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found`)
export const badRequest = (message: string, code = "invalid_request") => new ApiError(400, code, message)
export const unauthorized = (message = "Authentication required") => new ApiError(401, "unauthorized", message)
export const forbidden = (message = "Not allowed") => new ApiError(403, "forbidden", message)
export const conflict = (message: string, code = "conflict") => new ApiError(409, code, message)
