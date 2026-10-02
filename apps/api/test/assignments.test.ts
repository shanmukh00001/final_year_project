import request from "supertest";
import mongoose from "mongoose";
import { app } from "../src/app.js";
import { setupTestDb, teardownTestDb, clearTestDb } from "./setup.js";
import { User } from "../src/models/User.js";
import { Course } from "../src/models/Course.js";
import { signAccessToken } from "../src/services/tokens.js";

let studentToken: string;
let studentId: string;
let professorToken: string;
let professorId: string;
let sectionId: mongoose.Types.ObjectId;

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();

  sectionId = new mongoose.Types.ObjectId();

  const prof = await User.create({
    email: "prof@iitism.ac.in",
    passwordHash: "dummyhash",
    name: "Dr. Professor",
    role: "professor",
    isActive: true,
    tokenVersion: 0,
  });
  professorId = prof._id.toString();
  professorToken = await signAccessToken({ id: professorId, role: "professor", tokenVersion: 0 });

  const student = await User.create({
    email: "23je0001@iitism.ac.in",
    passwordHash: "dummyhash",
    name: "Shanmukh Kumar",
    role: "student",
    sectionIds: [sectionId],
    isActive: true,
    tokenVersion: 0,
  });
  studentId = student._id.toString();
  studentToken = await signAccessToken({ id: studentId, role: "student", tokenVersion: 0 });

  await Course.create({
    code: "DSP",
    name: "Digital Signal Processing",
    level: "UG",
    enabled: true,
    sections: [
      {
        _id: sectionId,
        name: "Section A",
        academicYear: "2026-27",
        professorIds: [prof._id],
      },
    ],
  });
});

describe("AC-ASG / AC-PROF: Assignments Lifecycle & Grading", () => {
  it("allows professor to create, publish, and student to submit and get graded", async () => {
    // 1. Professor creates assignment
    const createRes = await request(app)
      .post("/api/professor/assignments")
      .set("Authorization", `Bearer ${professorToken}`)
      .send({
        courseCode: "DSP",
        experimentId: "DSP-03",
        experimentVersion: 1,
        title: "FIR Filter Design: Window Method",
        instructions: "Design a 51-tap lowpass filter",
        sectionIds: [sectionId.toString()],
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        allowLate: true,
        maxMarks: 10,
        status: "published",
      });

    expect(createRes.status).toBe(201);
    const assignmentId = createRes.body.data.id;

    // 2. Student views assignments list
    const studentListRes = await request(app)
      .get("/api/assignments")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(studentListRes.status).toBe(200);
    expect(studentListRes.body.data.length).toBe(1);
    expect(studentListRes.body.data[0].status).toBe("not_started");

    // 3. Student upserts working draft
    const draftRes = await request(app)
      .put(`/api/assignments/${assignmentId}/workspace`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        files: [{ path: "main.py", content: "import numpy as np\n# In progress" }],
        mainFile: "main.py",
        parameters: { numtaps: 51 },
      });

    expect(draftRes.status).toBe(200);

    // Verify derived status is now in_progress
    const inProgressList = await request(app)
      .get("/api/assignments")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(inProgressList.body.data[0].status).toBe("in_progress");

    // 4. Student submits
    const submitRes = await request(app)
      .post(`/api/assignments/${assignmentId}/submission`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        files: [{ path: "main.py", content: "import numpy as np\n# Final solution" }],
        parameters: { numtaps: 51 },
        experimentVersion: 1,
        reportText: "Achieved 60dB stopband attenuation",
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe("submitted");
    expect(submitRes.body.data.isLate).toBe(false);

    // 5. Professor views submissions
    const submissionsList = await request(app)
      .get(`/api/professor/assignments/${assignmentId}/submissions`)
      .set("Authorization", `Bearer ${professorToken}`);

    expect(submissionsList.status).toBe(200);
    expect(submissionsList.body.data.length).toBe(1);
    const submissionId = submissionsList.body.data[0]._id;

    // 6. Professor grades submission
    const gradeRes = await request(app)
      .put(`/api/professor/submissions/${submissionId}/grade`)
      .set("Authorization", `Bearer ${professorToken}`)
      .send({
        marks: 8.5,
        feedback: "Excellent filter roll-off analysis.",
      });

    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.grade.marks).toBe(8.5);

    // 7. Student checks grade
    const studentSubRes = await request(app)
      .get(`/api/assignments/${assignmentId}/submission`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(studentSubRes.status).toBe(200);
    expect(studentSubRes.body.data.grade.marks).toBe(8.5);

    // 8. Professor checks analytics
    const analyticsRes = await request(app)
      .get(`/api/professor/assignments/${assignmentId}/analytics`)
      .set("Authorization", `Bearer ${professorToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.graded).toBe(1);
    expect(analyticsRes.body.data.mean).toBe(8.5);
  });
});
