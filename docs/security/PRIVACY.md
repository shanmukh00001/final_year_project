# V-Lab ECE: Privacy Policy & Data Governance

**Document Version:** 1.0.0  
**Compliance Standards:** Family Educational Rights and Privacy Act (FERPA), General Data Protection Regulation (GDPR principles)

---

## 1. Data Collection & Purpose Specification

V-Lab ECE collects and processes only the minimum data required to facilitate virtual laboratory learning, assignment submissions, and academic assessment:

| Data Category            | Specific Elements                                            | Processing Purpose                                      | Retention Period                                  |
| :----------------------- | :----------------------------------------------------------- | :------------------------------------------------------ | :------------------------------------------------ |
| **Account Credentials**  | Full Name, Email, Roll Number, Hashed Password, Role         | User authentication, section enrollment                 | Active academic enrollment + 1 year               |
| **Academic Submissions** | Python code snapshots, parameter states, figures, timestamps | Faculty assessment, grade assignment, similarity checks | Course duration + 3 academic years                |
| **Workspace State**      | Draft Python code, unsaved workspace parameters              | In-browser IndexedDB persistence for offline recovery   | Local to client device; cleared upon user request |
| **Audit Logs**           | Timestamp, Actor User ID, Action Type, Target Resource       | Platform security, fraud prevention, auditability       | 180 days rolling window                           |

---

## 2. Student & Faculty Privacy Safeguards

1. **No Third-Party Analytics / Trackers:** V-Lab ECE embeds zero third-party behavioral advertising or tracking scripts.
2. **Local Code Execution:** Student simulation scripts execute client-side in the browser's WebAssembly sandbox; intermediate simulation outputs do not traverse the network unless explicitly submitted.
3. **Plagiarism Processing:** Code similarity comparisons are performed entirely on institutional backend servers without transmitting student source code to external plagiarism APIs.

---

## 3. User Data Rights & Erasure

- **Right to Access & Export:** Students and faculty can export their assignment submissions, grades, and workspace code as JSON or CSV at any time.
- **Account Deletion & Data Anonymization:** In accordance with institutional data retention policies, administrative controls permit student data anonymization upon graduation or course withdrawal.
