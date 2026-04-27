import type { MiddlewareHandler } from "astro";

let handlersWired = false;

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Only wire cross-context event handlers for SSR API endpoints,
  // not during static prerendering (SSG) where tests may run.
  if (!handlersWired && context.url.pathname.startsWith("/api/")) {
    const { wireHandlers } = await import("../package/core/shared/config/wire-handlers");
    wireHandlers();
    handlersWired = true;
  }
  return next();
};
