import { Request, Response, NextFunction } from "express";

export type ErrorResponse = {
  error: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  requestId?: string;
};

export class AppError extends Error {
  constructor(
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    message: string = "Internal Server Error"
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  const message = err.message || "Internal Server Error";

  const response: ErrorResponse = {
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.headers["x-request-id"] as string
  };

  console.error("Error:", {
    statusCode,
    code,
    message,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
