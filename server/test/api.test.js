const test = require("node:test");
const assert = require("node:assert/strict");

process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "";
const app = require("../app");

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test("GET /api/health returns ok", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test("GET /api/unknown returns 404", async () => {
  const res = await fetch(`${baseUrl}/api/unknown`);
  assert.equal(res.status, 404);
});

test("POST /api/chat rejects an empty message", async () => {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "" }),
  });
  assert.equal(res.status, 400);
});

test("POST /api/bookings rejects a missing name/email", async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error);
});

test("GET /api/bookings requires authentication", async () => {
  const res = await fetch(`${baseUrl}/api/bookings`);
  assert.equal(res.status, 401);
});

test("POST /api/auth/login rejects an invalid email", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "x" }),
  });
  assert.equal(res.status, 400);
});
