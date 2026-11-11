import { makeError, type ApiErrorBody } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public field?: string,
    public rows?: number[]
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function apiHandler(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse | Response> => {
    const requestId =
      req.headers.get("x-request-id") ||
      `req_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const response = await handler(req, ctx);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        const errorBody: ApiErrorBody = makeError(err.code, err.message, {
          field: err.field,
          rows: err.rows,
          request_id: requestId,
        });
        return NextResponse.json(errorBody, {
          status: err.statusCode,
          headers: { "x-request-id": requestId },
        });
      }

      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const field = firstIssue?.path.join(".");
        const message = firstIssue?.message || "Invalid input";
        const errorBody: ApiErrorBody = makeError("INVALID_INPUT", message, {
          field,
          request_id: requestId,
        });
        return NextResponse.json(errorBody, {
          status: 422,
          headers: { "x-request-id": requestId },
        });
      }

      const errorReference = `err_${Math.random().toString(36).substring(2, 10)}`;
      console.error(`[API Error ${errorReference}]`, err);

      const errorBody: ApiErrorBody = makeError(
        "INTERNAL_SERVER_ERROR",
        `An unexpected error occurred. Reference: ${errorReference}`,
        { request_id: requestId }
      );
      return NextResponse.json(errorBody, {
        status: 500,
        headers: { "x-request-id": requestId },
      });
    }
  };
}
