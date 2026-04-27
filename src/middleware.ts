import type { MiddlewareHandler } from "astro";
import { wireHandlers } from "../package/core/shared/config/wire-handlers";

let handlersWired = false;

export const onRequest: MiddlewareHandler = async (_context, next) => {
  if (!handlersWired) {
    wireHandlers();
    handlersWired = true;
  }
  return next();
};
