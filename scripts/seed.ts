/* eslint-disable no-console */
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../apps/api/src/config/db.js";
import { User } from "../apps/api/src/models/User.js";
import { Course } from "../apps/api/src/models/Course.js";
import { LabAssignment } from "../apps/api/src/models/LabAssignment.js";

async function seedDatabase() {
  console.log(">>> Connecting to MongoDB Atlas...");
  await connectDb();
  console.log(">>> Connected!");

  // Clear existing collections
  await User.deleteMany({});
  await Course.deleteMany({});
  await LabAssignment.deleteMany({});

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", saltRounds);
  const profPasswordHash = await bcrypt.hash("ProfPass123!", saltRounds);
  const userPasswordHash = await bcrypt.hash("123456", saltRounds);

  // 1. Create Admin
  const _admin = await User.create({
    email: "admin@iitism.ac.in",
    passwordHash: adminPasswordHash,
    name: "System Admin",
    role: "admin",
    isActive: true,
  });

  // 2. Create Professors
  const profECE = await User.create({
    email: "prof.ece@iitism.ac.in",
    passwordHash: profPasswordHash,
    name: "Dr. A. K. Sharma",
    role: "professor",
    isActive: true,
  });

  const profDSP = await User.create({
    email: "prof.dsp@iitism.ac.in",
    passwordHash: profPasswordHash,
    name: "Dr. R. P. Singh",
    role: "professor",
    isActive: true,
  });

  // 3. Create Courses & Sections
  const dspCourse = await Course.create({
    code: "DSP",
    name: "Digital Signal Processing",
    level: "UG",
    enabled: true,
    sections: [
      {
        name: "Section A",
        academicYear: "2026-27",
        professorIds: [profDSP._id],
      },
    ],
  });

  const _ssCourse = await Course.create({
    code: "SS",
    name: "Signals and Systems",
    level: "UG",
    enabled: true,
    sections: [
      {
        name: "Section A",
        academicYear: "2026-27",
        professorIds: [profECE._id],
      },
    ],
  });

  const _dipCourse = await Course.create({
    code: "DIP",
    name: "Digital Image Processing",
    level: "PG",
    enabled: true,
    sections: [
      {
        name: "Section PG-1",
        academicYear: "2026-27",
        professorIds: [profECE._id],
      },
    ],
  });

  const sectionId = dspCourse.sections[0]._id;

  // 4. Create Student (23JE0638)
  const _student = await User.create({
    email: "23je0638@students.iitism.ac.in",
    passwordHash: userPasswordHash,
    name: "Shanmukh",
    role: "student",
    rollNo: "23JE0638",
    programme: "BTech",
    batchYear: 2026,
    sectionIds: [sectionId],
    isActive: true,
  });

  // 5. Create Sample Assignments
  const assignment1 = await LabAssignment.create({
    courseId: dspCourse._id,
    courseCode: "DSP",
    experimentId: "DSP-03",
    experimentVersion: 1,
    title: "FIR Filter Design & Order Analysis",
    instructions:
      "Implement a low-pass Hamming-window FIR filter with cutoff fc=0.3 and numtaps=51. Plot the magnitude response.",
    createdBy: profDSP._id,
    sectionIds: [sectionId],
    publishAt: new Date(),
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
    allowLate: true,
    lateUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    allowResubmit: true,
    maxMarks: 100,
    status: "published",
    starterCodeOverride: null,
    parameterOverrides: {},
  });

  console.log("\n============================================");
  console.log("🎉 DATABASE SEEDED SUCCESSFULLY!");
  console.log("============================================");
  console.log("Admin Account    : admin@iitism.ac.in / AdminPass123!");
  console.log("Faculty Accounts : prof.dsp@iitism.ac.in / ProfPass123!");
  console.log("                 : prof.ece@iitism.ac.in / ProfPass123!");
  console.log("Student Account  : 23je0638@students.iitism.ac.in / 123456");
  console.log("Roll No          : 23JE0638");
  console.log("Courses Seeded   : DSP, SS, DIP");
  console.log("Assignment Seeded: " + assignment1.title + " (DSP-03)");
  console.log("============================================\n");

  await disconnectDb();
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("Seeding Error:", err);
  process.exit(1);
});
