import request from "supertest";
import { app } from "../src/app.js";
import { setupTestDb, teardownTestDb, clearTestDb } from "./setup.js";
import { User } from "../src/models/User.js";
import { signAccessToken } from "../src/services/tokens.js";

let user1Token: string;
let user1Id: string;
let user2Token: string;
let user2Id: string;

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();

  const u1 = await User.create({
    email: "23je0001@iitism.ac.in",
    passwordHash: "dummyhash",
    name: "User One",
    role: "student",
    isActive: true,
    tokenVersion: 0,
  });
  user1Id = u1._id.toString();
  user1Token = await signAccessToken({ id: user1Id, role: "student", tokenVersion: 0 });

  const u2 = await User.create({
    email: "23je0002@iitism.ac.in",
    passwordHash: "dummyhash",
    name: "User Two",
    role: "student",
    isActive: true,
    tokenVersion: 0,
  });
  user2Id = u2._id.toString();
  user2Token = await signAccessToken({ id: user2Id, role: "student", tokenVersion: 0 });
});

describe("AC-SAVE: Workspaces CRUD & Concurrency", () => {
  const validWorkspace = {
    name: "FIR Filter Project",
    experimentId: "DSP-03",
    experimentVersion: 1,
    files: [
      {
        path: "main.py",
        content: "import numpy as np\nprint('Hello')",
      },
    ],
    mainFile: "main.py",
    parameters: { numtaps: 51 },
  };

  it("creates, reads, lists, updates with If-Match, and deletes a workspace", async () => {
    // 1. Create
    const createRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${user1Token}`)
      .send(validWorkspace);

    expect(createRes.status).toBe(201);
    const workspaceId = createRes.body.data.id;
    expect(createRes.body.data.revision).toBe(1);

    // 2. Read
    const getRes = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe(validWorkspace.name);
    expect(getRes.headers["etag"]).toBe('"1"');

    // 3. List
    const listRes = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${user1Token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);

    // 4. Update with wrong If-Match -> 409
    const conflictUpdate = await request(app)
      .put(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${user1Token}`)
      .set("If-Match", '"99"')
      .send({
        ...validWorkspace,
        files: [{ path: "main.py", content: "print('Updated')" }],
      });

    expect(conflictUpdate.status).toBe(409);
    expect(conflictUpdate.body.error.code).toBe("E_CONFLICT");

    // 5. Update with valid If-Match -> 200 (revision 2)
    const validUpdate = await request(app)
      .put(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${user1Token}`)
      .set("If-Match", '"1"')
      .send({
        ...validWorkspace,
        files: [{ path: "main.py", content: "print('Updated')" }],
      });

    expect(validUpdate.status).toBe(200);
    expect(validUpdate.body.data.revision).toBe(2);

    // 6. Delete
    const delRes = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);

    const checkDel = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(checkDel.status).toBe(404);
  });

  it("enforces tenant isolation (returns 404 for other user's workspace)", async () => {
    const createRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${user1Token}`)
      .send(validWorkspace);

    const workspaceId = createRes.body.data.id;

    // User 2 attempts to read User 1's workspace
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("E_NOT_FOUND");
  });

  it("rejects workspace exceeding 200 KB with 413 E_LIMIT_WORKSPACE", async () => {
    const largeContent = "x".repeat(210000);
    const res = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        ...validWorkspace,
        files: [{ path: "main.py", content: largeContent }],
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("E_LIMIT_WORKSPACE");
  });
});
