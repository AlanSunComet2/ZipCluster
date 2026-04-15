import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Response } from "express";
import { authorizeRole } from "../middleware/authorizeRole";
import type { AuthenticatedRequest } from "../types/auth";

const createResponse = (): Response => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response as unknown as Response;
};

test("authorizeRole returns 403 when role is disallowed", () => {
  const req = {
    user: {
      sub: "user-1",
      email: "user@example.com",
      role: "USER",
      iat: 0,
      exp: 0,
    },
  } as AuthenticatedRequest;

  const res = createResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  authorizeRole(["ADMIN"])(req, res, next);
  assert.equal((res as unknown as { statusCode: number }).statusCode, 403);
  assert.equal(nextCalled, false);
});

test("authorizeRole calls next for allowed role", () => {
  const req = {
    user: {
      sub: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    },
  } as AuthenticatedRequest;

  const res = createResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  authorizeRole(["ADMIN", "AGENT"])(req, res, next);
  assert.equal(nextCalled, true);
});
