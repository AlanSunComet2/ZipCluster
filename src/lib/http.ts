import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";

export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as T;
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => issue.message).join("; ");
        next(new HttpError(400, `Invalid request body: ${details}`));
        return;
      }

      next(error);
    }
  };

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: "Internal server error." });
};
