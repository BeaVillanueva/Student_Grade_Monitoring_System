import axios from "axios";
export type ErrorContext = "login" | "protected";
export type ErrorKind =
  | "validation"
  | "authentication"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "server"
  | "network"
  | "timeout"
  | "cancelled"
  | "configuration"
  | "response";
export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly context: ErrorContext;
  readonly retryAfterSeconds?: number;
  constructor(
    kind: ErrorKind,
    message: string,
    context: ErrorContext = "protected",
    status?: number,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.context = context;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    // Never retain an Axios error/config/cause, response payload, or stack trace.
    this.stack = undefined;
  }
  toJSON() {
    return {
      kind: this.kind,
      message: this.message,
      status: this.status,
      context: this.context,
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }
}
export function normalizeApiError(
  error: unknown,
  context: ErrorContext,
): ApiError {
  if (error instanceof ApiError) return error;
  if (
    axios.isCancel(error) ||
    (error instanceof Error && error.name === "AbortError")
  )
    return new ApiError("cancelled", "Request cancelled.", context);
  if (!axios.isAxiosError(error))
    return new ApiError(
      "network",
      "Unable to connect. Please try again.",
      context,
    );
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code ?? ""))
    return new ApiError(
      "timeout",
      "The request timed out. Please try again.",
      context,
    );
  const status = error.response?.status;
  if (status === undefined)
    return new ApiError(
      "network",
      "Unable to connect. Please try again.",
      context,
    );
  const known: Record<number, [ErrorKind, string]> = {
    400: ["validation", "Invalid request. Check the entered values."],
    401: [
      "authentication",
      context === "login"
        ? "Authentication failed. Check your credentials."
        : "Your session is unavailable or has expired. Please sign in again.",
    ],
    403: ["forbidden", "You do not have permission to perform this action."],
    404: ["not-found", "The requested record was not found."],
    409: [
      "conflict",
      "The request conflicts with existing data or an academic restriction. Refresh and review the record.",
    ],
    429: ["rate-limit", "Too many requests. Please wait before trying again."],
  };
  const [kind, message] = known[status] ?? [
    "server",
    "The request could not be completed. Please try again later.",
  ];
  const retryHeader: unknown = error.response?.headers?.["retry-after"];
  const seconds =
    typeof retryHeader === "string" && /^\d+$/.test(retryHeader)
      ? Number(retryHeader)
      : undefined;
  return new ApiError(
    kind,
    message,
    context,
    status,
    seconds !== undefined && seconds <= 3600 ? seconds : undefined,
  );
}
