import type { Request } from "express";
import type { User } from "@workspace/db/schema";

type RequestContext = {
  user?: User;
  sessionId?: string;
};

const requestContext = new WeakMap<Request, RequestContext>();

export function setRequestContext(
  req: Request,
  context: RequestContext,
): void {
  requestContext.set(req, context);
}

export function getRequestContext(req: Request): RequestContext | undefined {
  return requestContext.get(req);
}

export function getRequestUser(req: Request): User | undefined {
  return requestContext.get(req)?.user;
}
