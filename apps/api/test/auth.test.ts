import request from "supertest";
import { app } from "../src/app.js";
import { setupTestDb, teardownTestDb, clearTestDb } from "./setup.js";

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("AC-AUTH / AC-SEC: Auth & CSRF Protection", () => {
  const studentData = {
    email: "23je0001@iitism.ac.in",
    password: "Password123!",
    name: "Shanmukh Kumar",
    rollNo: "23JE0001",
    programme: "BTech",
    batchYear: 2023,
  };

  it("registers a student successfully and issues access token and httpOnly cookie", async () => {
    const res = await request(app).post("/api/auth/register").send(studentData);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(studentData.email);
    expect(res.body.data.user.role).toBe("student");
    expect(res.body.data.accessToken).toBeDefined();

    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies![0]).toContain("vlab_rt=");
    expect(cookies![0]).toContain("HttpOnly");
  });

  it("rejects registration with disallowed email domain", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...studentData, email: "student@gmail.com" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("E_EMAIL_DOMAIN");
  });

  it("rejects registration with duplicate email", async () => {
    await request(app).post("/api/auth/register").send(studentData);
    const res = await request(app).post("/api/auth/register").send(studentData);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("E_CONFLICT");
  });

  it("logs in with valid credentials and increments failedLoginCount on bad password", async () => {
    await request(app).post("/api/auth/register").send(studentData);

    // Bad password
    const badRes = await request(app)
      .post("/api/auth/login")
      .send({ email: studentData.email, password: "WrongPassword!" });

    expect(badRes.status).toBe(401);
    expect(badRes.body.error.code).toBe("E_INVALID_CREDENTIALS");

    // Good password
    const goodRes = await request(app)
      .post("/api/auth/login")
      .send({ email: studentData.email, password: studentData.password });

    expect(goodRes.status).toBe(200);
    expect(goodRes.body.data.accessToken).toBeDefined();
  });

  it("enforces session proof header (X-Requested-With / X-Session-Proof) on refresh", async () => {
    const regRes = await request(app).post("/api/auth/register").send(studentData);
    const rawCookies = regRes.headers["set-cookie"] as unknown as string[];
    const cookieHeader = rawCookies[0]!.split(";")[0]!;

    // Request missing header -> 403
    const noHeaderRes = await request(app).post("/api/auth/refresh").set("Cookie", cookieHeader);

    expect(noHeaderRes.status).toBe(403);
    expect(noHeaderRes.body.error.code).toBe("E_FORBIDDEN");

    // Request with X-Requested-With: vlab -> 200
    const validRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader)
      .set("X-Requested-With", "vlab");

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.accessToken).toBeDefined();
  });

  it("detects refresh token reuse and revokes entire token family", async () => {
    const regRes = await request(app).post("/api/auth/register").send(studentData);
    const rawCookies = regRes.headers["set-cookie"] as unknown as string[];
    const initialCookie = rawCookies[0]!.split(";")[0]!;

    // First rotation (valid)
    const refresh1 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", initialCookie)
      .set("X-Requested-With", "vlab");

    expect(refresh1.status).toBe(200);
    const newCookies = refresh1.headers["set-cookie"] as unknown as string[];
    const secondCookie = newCookies[0]!.split(";")[0]!;

    // Replay initial token (Reuse attack!)
    const reuseAttempt = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", initialCookie)
      .set("X-Requested-With", "vlab");

    expect(reuseAttempt.status).toBe(401);

    // Verify subsequent attempt with secondCookie is also revoked
    const secondAttempt = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", secondCookie)
      .set("X-Requested-With", "vlab");

    expect(secondAttempt.status).toBe(401);
  });

  it("authenticates GET /api/auth/me and updates preferences via PATCH /api/auth/me", async () => {
    const regRes = await request(app).post("/api/auth/register").send(studentData);
    const token = regRes.body.data.accessToken;

    const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(studentData.email);

    const patchRes = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        preferences: {
          theme: "dark",
          editorFontSize: 16,
          liveRun: true,
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.preferences.theme).toBe("dark");
    expect(patchRes.body.data.preferences.editorFontSize).toBe(16);
    expect(patchRes.body.data.preferences.liveRun).toBe(true);
  });
});
