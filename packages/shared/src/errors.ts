export type ErrorCode =
  | "E_SYNTAX"
  | "E_RUNTIME"
  | "E_POLICY_VIOLATION"
  | "E_PACKAGE_LOAD"
  | "E_LIMIT_TIMEOUT"
  | "E_LIMIT_ARRAY"
  | "E_LIMIT_STDOUT"
  | "E_LIMIT_MEMORY"
  | "E_LIMIT_UPLOAD"
  | "E_LIMIT_WORKSPACE"
  | "E_LIMIT_WORKSPACE_COUNT"
  | "E_CANCELLED"
  | "E_ENGINE_BOOT"
  | "E_FS"
  | "E_INTERNAL"
  | "E_BAD_REQUEST"
  | "E_UNAUTHENTICATED"
  | "E_INVALID_CREDENTIALS"
  | "E_FORBIDDEN"
  | "E_ACCOUNT_DISABLED"
  | "E_NOT_FOUND"
  | "E_CONFLICT"
  | "E_ALREADY_SUBMITTED"
  | "E_PAST_DEADLINE"
  | "E_VALIDATION"
  | "E_EMAIL_DOMAIN"
  | "E_EMAIL_UNVERIFIED"
  | "E_MARKS_RANGE"
  | "E_RATE_LIMITED"
  | "E_CONSENT_REQUIRED";

export interface PyError {
  code: ErrorCode;
  name: string;
  message: string;
  line: number | null;
  column: number | null;
  traceback: string;
}
