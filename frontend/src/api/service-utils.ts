import type { z } from "zod";
import type { ApiRequest, ApiTransport } from "./client.ts";
import { ApiError } from "./errors.ts";
import { recordIdSchema } from "../lib/validation.ts";
export function validated<S extends z.ZodType>(
  schema: S,
  value: unknown,
): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(
      "validation",
      "Invalid request. Check the entered values.",
      "protected",
      400,
    );
  return result.data;
}
export const recordPath = (resource: string, id: number) =>
  `/${resource}/${validated(recordIdSchema, id)}`;
export async function execute<S extends z.ZodType>(
  transport: ApiTransport,
  request: ApiRequest,
  schema: S,
): Promise<z.output<S>> {
  const data = await transport.request<unknown>(request);
  const result = schema.safeParse(data);
  if (!result.success)
    throw new ApiError(
      "response",
      "The server returned an unexpected response.",
      request.access === "public" ? "login" : "protected",
    );
  return result.data;
}
