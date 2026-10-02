import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z
    .string()
    .startsWith("mongodb")
    .default(
      process.env["MONGO_URI"] ||
        "mongodb+srv://shanmukhanagasaineduri_db_user:ICPSOlh5IsO60cub@cluster0.3e1qesr.mongodb.net/final_year_project?appName=Cluster0",
    ),
  JWT_ACCESS_SECRET: z.string().min(32).default("super-secret-jwt-access-key-32-chars-min!"),
  JWT_ACCESS_SECRET_PREV: z.string().min(32).optional(),
  REFRESH_TOKEN_PEPPER: z.string().min(32).default("super-secret-refresh-pepper-32-chars-min!"),
  IP_HASH_SECRET: z.string().min(32).default("super-secret-ip-hash-secret-32-chars-min!"),
  ALLOWED_EMAIL_DOMAINS: z.string().default("iitism.ac.in,students.iitism.ac.in"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
  EMAIL_API_KEY: z.string().optional().default("test-email-key"),
  EMAIL_FROM: z.string().email().default("noreply@vlab.iitism.ac.in"),
  MONITOR_TOKEN: z.string().min(16).default("super-secret-monitor-token-16-chars-min"),
  ERASE_KEEPS_GRADES: z.enum(["true", "false"]).default("false"),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
});

export const env = envSchema.parse(process.env);
