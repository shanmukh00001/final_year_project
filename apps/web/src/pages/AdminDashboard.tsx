import React, { useState } from "react";
import {
  Shield,
  Users,
  UploadCloud,
  Server,
  Activity,
  UserCheck,
  Search,
  CheckCircle2,
} from "lucide-react";
import { CsvImportModal } from "../components/admin/CsvImportModal.js";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  rollNumber?: string | undefined;
  role: "student" | "professor" | "admin";
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  ip: string;
  timestamp: string;
  status: "SUCCESS" | "DENIED" | "WARNING";
}

const INITIAL_USERS: AdminUser[] = [
  {
    id: "usr-01",
    email: "aditya.sharma@ece.vlab.edu",
    fullName: "Aditya Sharma",
    rollNumber: "21ECE045",
    role: "student",
    isActive: true,
    createdAt: "2026-09-01",
    lastLogin: "2026-10-02 14:22",
  },
  {
    id: "usr-02",
    email: "priya.varma@ece.vlab.edu",
    fullName: "Priya Varma",
    rollNumber: "21ECE089",
    role: "student",
    isActive: true,
    createdAt: "2026-09-01",
    lastLogin: "2026-10-02 13:10",
  },
  {
    id: "usr-03",
    email: "prof.rao@ece.vlab.edu",
    fullName: "Dr. K. S. Rao",
    role: "professor",
    isActive: true,
    createdAt: "2026-08-15",
    lastLogin: "2026-10-02 15:40",
  },
  {
    id: "usr-04",
    email: "prof.mehta@ece.vlab.edu",
    fullName: "Dr. Anjali Mehta",
    role: "professor",
    isActive: true,
    createdAt: "2026-08-20",
    lastLogin: "2026-10-01 11:15",
  },
  {
    id: "usr-05",
    email: "admin@vlab.edu",
    fullName: "System Administrator",
    role: "admin",
    isActive: true,
    createdAt: "2026-08-01",
    lastLogin: "2026-10-02 16:05",
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    action: "AUTH_LOGIN_SUCCESS",
    actor: "prof.rao@ece.vlab.edu",
    target: "Session 06d638a0",
    ip: "192.168.1.104",
    timestamp: "2026-10-02 15:40:12",
    status: "SUCCESS",
  },
  {
    id: "log-2",
    action: "ASSIGNMENT_PUBLISH",
    actor: "prof.rao@ece.vlab.edu",
    target: "asg-01 (DSP-01)",
    ip: "192.168.1.104",
    timestamp: "2026-10-02 15:42:01",
    status: "SUCCESS",
  },
  {
    id: "log-3",
    action: "SUBMISSION_GRADE",
    actor: "prof.rao@ece.vlab.edu",
    target: "sub-01 (21ECE045: 95/100)",
    ip: "192.168.1.104",
    timestamp: "2026-10-02 15:55:30",
    status: "SUCCESS",
  },
  {
    id: "log-4",
    action: "CSRF_GUARD_BLOCK",
    actor: "unknown",
    target: "/api/auth/refresh",
    ip: "45.33.32.156",
    timestamp: "2026-10-02 16:01:45",
    status: "DENIED",
  },
];

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const handleRoleChange = (userId: string, newRole: AdminUser["role"]) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
    const target = users.find((u) => u.id === userId);
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        action: "USER_ROLE_MUTATE",
        actor: "admin@vlab.edu",
        target: `${target?.email || userId} -> ${newRole}`,
        ip: "127.0.0.1",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        status: "SUCCESS",
      },
      ...prev,
    ]);
    setAlertMsg(`Updated role to ${newRole}`);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleToggleActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u)),
    );
  };

  const handleImportSuccess = (count: number) => {
    setAlertMsg(`Successfully enrolled ${count} new student accounts via CSV batch.`);
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.rollNumber && u.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const studentCount = users.filter((u) => u.role === "student").length;
  const professorCount = users.filter((u) => u.role === "professor").length;

  return (
    <div className="flex min-h-screen w-full flex-col bg-bg text-fg select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-line bg-surface/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-fg flex items-center gap-2">
              <span>Institutional Administration Console</span>
              <span className="rounded bg-accent-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-500">
                SuperAdmin
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand/90 transition"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Bulk CSV Student Import</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 text-xs">
        {alertMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-green-500 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{alertMsg}</span>
          </div>
        )}

        {/* System Vitals KPI Strip */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Registered Students</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">{studentCount}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Faculty Accounts</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">{professorCount}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">API Backend Status</p>
              <h3 className="text-sm font-bold text-green-500 font-mono mt-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>ONLINE · Port 4000</span>
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <Server className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-fg-subtle">Audit Events Recorded</p>
              <h3 className="text-2xl font-bold text-fg font-mono mt-1">{auditLogs.length}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* User & Role Management Table */}
        <div className="rounded-xl border border-line bg-surface shadow-sm overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-fg">User Directory & Role Permissions</h2>
            <div className="flex items-center gap-3">
              {/* Role filter */}
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {["ALL", "student", "professor", "admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`rounded px-2.5 py-1 capitalize transition ${
                      roleFilter === r
                        ? "bg-brand text-white font-medium"
                        : "text-fg-muted hover:bg-hover hover:text-fg"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-fg-subtle" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user name or email..."
                  className="w-full rounded border border-line bg-surface px-2.5 pl-8 py-1 text-xs text-fg focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-2/40 text-fg-muted font-semibold">
                  <th className="py-2.5 px-4">User Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Roll Number</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">Last Login</th>
                  <th className="py-2.5 px-4">Account Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-hover transition">
                    <td className="py-3 px-4 font-semibold text-fg">{u.fullName}</td>
                    <td className="py-3 px-4 font-mono text-fg-subtle text-[11px]">{u.email}</td>
                    <td className="py-3 px-4 font-mono text-brand text-[11px]">
                      {u.rollNumber || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as AdminUser["role"])
                        }
                        className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg focus:outline-none focus:border-brand"
                      >
                        <option value="student">Student</option>
                        <option value="professor">Professor</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono text-fg-subtle text-[11px]">
                      {u.lastLogin}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          u.isActive
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {u.isActive ? "ACTIVE" : "SUSPENDED"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setAlertMsg(`Triggered password reset email for ${u.email}`);
                          setTimeout(() => setAlertMsg(null), 3000);
                        }}
                        className="rounded border border-line px-2 py-1 text-[11px] text-fg-muted hover:bg-hover hover:text-fg"
                      >
                        Reset Auth
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Audit Log Stream */}
        <div className="rounded-xl border border-line bg-surface shadow-sm overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand" />
              <h2 className="text-xs font-semibold text-fg">Security & System Audit Logs</h2>
            </div>
            <span className="font-mono text-[11px] text-fg-subtle">Real-time event stream</span>
          </div>

          <div className="divide-y divide-line max-h-60 overflow-y-auto font-mono text-[11px]">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 hover:bg-hover transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold text-[10px] ${
                      log.status === "SUCCESS"
                        ? "bg-green-500/10 text-green-500"
                        : log.status === "DENIED"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="font-bold text-fg">{log.action}</span>
                  <span className="text-fg-subtle">•</span>
                  <span className="text-fg-muted">{log.actor}</span>
                  <span className="text-fg-subtle">→ {log.target}</span>
                </div>
                <div className="flex items-center gap-3 text-fg-subtle">
                  <span>IP: {log.ip}</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* CSV Importer Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};
