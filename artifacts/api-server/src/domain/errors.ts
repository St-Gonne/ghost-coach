export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export class IntegrationError extends AppError {
  constructor(
    integration: string,
    message: string,
  ) {
    super(`[${integration}] ${message}`, "INTEGRATION_ERROR", 502);
    this.name = "IntegrationError";
  }
}

export class PlannerError extends AppError {
  constructor(message: string) {
    super(message, "PLANNER_ERROR", 500);
    this.name = "PlannerError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
