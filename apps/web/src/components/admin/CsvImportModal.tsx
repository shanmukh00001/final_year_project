import React, { useState } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  AlertTriangle,
  Download,
} from "lucide-react";

export interface ParsedStudentRecord {
  rollNumber: string;
  fullName: string;
  email: string;
  courseCode: string;
  section: string;
  isValid: boolean;
  validationError?: string | undefined;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (count: number) => void;
}

const SAMPLE_CSV = `rollNumber,fullName,email,courseCode,section
21ECE001,Aarav Patel,aarav.patel@ece.vlab.edu,DSP,Section-A
21ECE002,Ananya Iyer,ananya.iyer@ece.vlab.edu,DSP,Section-A
21ECE003,Devendra Sen,devendra.sen@ece.vlab.edu,DSP,Section-B
21ECE004,Kavya Nair,kavya.nair@ece.vlab.edu,NT,Section-A
21ECE005,Rohan Gupta,rohan.gupta@ece.vlab.edu,SS,Section-C`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedStudentRecord[]>([]);
  const [isCommitted, setIsCommitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleParseCsv = (rawContent: string) => {
    setError(null);

    const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError("CSV must contain at least a header row and one student record.");
      setParsedRows([]);
      return;
    }

    const headers = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) || [];
    const expected = ["rollnumber", "fullname", "email", "coursecode", "section"];
    const hasAll = expected.every((h) => headers.includes(h));

    if (!hasAll) {
      setError("CSV header must contain: rollNumber, fullName, email, courseCode, section");
      setParsedRows([]);
      return;
    }

    const records: ParsedStudentRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 5) {
        records.push({
          rollNumber: parts[0] || "Unknown",
          fullName: parts[1] || "",
          email: parts[2] || "",
          courseCode: parts[3] || "",
          section: parts[4] || "",
          isValid: false,
          validationError: "Incomplete row columns",
        });
        continue;
      }

      const [rollNumber, fullName, email, courseCode, section] = parts;
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
      const isCourseValid = ["SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"].includes(
        courseCode?.toUpperCase() || "",
      );

      let validationError: string | undefined;
      if (!isEmailValid) {
        validationError = "Invalid email address format";
      } else if (!isCourseValid) {
        validationError = `Invalid course code "${courseCode}"`;
      }

      records.push({
        rollNumber: rollNumber || "",
        fullName: fullName || "",
        email: email || "",
        courseCode: (courseCode || "").toUpperCase(),
        section: section || "Section-A",
        isValid: !validationError,
        validationError,
      });
    }

    setParsedRows(records);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleUseSample = () => {
    handleParseCsv(SAMPLE_CSV);
  };

  const handleCommitImport = () => {
    const validCount = parsedRows.filter((r) => r.isValid).length;
    if (validCount === 0) {
      setError("No valid student records to import.");
      return;
    }

    setIsCommitted(true);
    setTimeout(() => {
      onImportSuccess?.(validCount);
      setIsCommitted(false);
      onClose();
    }, 1500);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-line bg-surface shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">Bulk Student Roster Importer</h2>
              <p className="text-xs text-fg-subtle">
                Batch-create student accounts and assign them to course sections via CSV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-hover hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isCommitted ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-fg">Roster Imported Successfully!</h3>
            <p className="text-xs text-fg-subtle max-w-sm">
              Enrolled {validCount} students into course sections and generated login credentials.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Dropzone & Sample Trigger */}
            <div className="rounded-xl border-2 border-dashed border-line hover:border-brand bg-surface-2/40 p-6 text-center transition flex flex-col items-center justify-center space-y-3">
              <FileSpreadsheet className="h-10 w-10 text-brand stroke-1" />
              <div>
                <p className="font-semibold text-xs text-fg">
                  Upload CSV file or drop it here
                </p>
                <p className="text-[11px] text-fg-subtle mt-0.5">
                  Expected columns: <code className="font-mono text-brand">rollNumber, fullName, email, courseCode, section</code>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer rounded-lg bg-brand px-4 py-1.5 font-medium text-white shadow-sm hover:bg-brand/90 transition text-xs">
                  <span>Browse CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUseSample}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg-muted hover:bg-hover hover:text-fg transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Load 5-Student Sample</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-fg">
                    Parsed Roster Preview ({parsedRows.length} rows)
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-green-500 font-semibold">{validCount} valid</span>
                    {invalidCount > 0 && (
                      <span className="text-red-500 font-semibold">{invalidCount} errors</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-line overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-fg-muted font-semibold">
                        <th className="p-2">Roll No</th>
                        <th className="p-2">Full Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Course</th>
                        <th className="p-2">Section</th>
                        <th className="p-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {parsedRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-hover ${
                            !r.isValid ? "bg-red-500/5 text-red-400" : ""
                          }`}
                        >
                          <td className="p-2 font-bold">{r.rollNumber}</td>
                          <td className="p-2 font-sans text-fg">{r.fullName}</td>
                          <td className="p-2 text-fg-subtle">{r.email}</td>
                          <td className="p-2 text-brand font-bold">{r.courseCode}</td>
                          <td className="p-2 text-fg-muted">{r.section}</td>
                          <td className="p-2 text-right">
                            {r.isValid ? (
                              <span className="text-green-500 font-semibold text-[10px]">
                                READY
                              </span>
                            ) : (
                              <span
                                className="text-red-500 font-semibold text-[10px] flex items-center justify-end gap-1"
                                title={r.validationError}
                              >
                                <AlertTriangle className="h-3 w-3" /> ERROR
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-3 py-1.5 text-fg-muted hover:bg-hover hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={validCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-brand/90 disabled:opacity-40 transition"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Import {validCount} Students</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
