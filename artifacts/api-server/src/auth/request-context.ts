import type { User } from "@workspace/db/schema";

declare module "express-serve-static-core" {
  interface Request {
    ghostCoachUser?: User;
    ghostCoachSessionId?: string;
  }
}

export {};
