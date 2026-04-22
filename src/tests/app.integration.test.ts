import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";

test("GET /health returns ok", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const response = await request(app).get("/health");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /admin/analytics/overview rejects missing token", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const response = await request(app).get("/admin/analytics/overview");
  assert.equal(response.statusCode, 401);
});

test("POST /auth/change-password rejects unauthenticated requests", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const response = await request(app)
    .post("/auth/change-password")
    .send({ currentPassword: "ChangeMe123!", newPassword: "NewPassword123!" });
  assert.equal(response.statusCode, 401);
});

test("DELETE /admin/listings/:id requires admin token", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-access-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
  const { createApp } = await import("../app.js");
  const app = createApp();

  const response = await request(app).delete("/admin/listings/any-id").send({ confirm: "DELETE" });
  assert.equal(response.statusCode, 401);
});
