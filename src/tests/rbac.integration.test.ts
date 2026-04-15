import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";

const signToken = (role: "ADMIN" | "AGENT" | "USER", secret: string): string =>
  jwt.sign({ sub: `${role.toLowerCase()}-demo`, email: `${role.toLowerCase()}@demo.local`, role }, secret, {
    expiresIn: "15m",
  });

test("RBAC: AGENT token cannot access admin route", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/real_estate_marketplace";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const token = signToken("AGENT", process.env.JWT_SECRET);
  const response = await request(app)
    .get("/admin/listings/pending")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
});

test("RBAC: USER token cannot access agent route", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/real_estate_marketplace";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const token = signToken("USER", process.env.JWT_SECRET);
  const response = await request(app)
    .get("/agents/me/listings")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
});

test("RBAC: ADMIN token can pass admin role gate", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/real_estate_marketplace";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const token = signToken("ADMIN", process.env.JWT_SECRET);
  const response = await request(app)
    .get("/admin/listings/pending")
    .set("Authorization", `Bearer ${token}`);

  assert.notEqual(response.statusCode, 401);
  assert.notEqual(response.statusCode, 403);
});
