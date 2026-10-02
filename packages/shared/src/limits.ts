// Hard and default runtime limits (SCOPE §4.2)
export const RUN_TIMEOUT_MS = 30_000;
export const MAX_RUN_TIMEOUT_MS = 120_000;
export const CANCEL_GRACE_MS = 2_000;
export const MAX_ARRAY_ELEMENTS = 20_000_000;
export const MAX_WORKER_HEAP_MB = 1_200;
export const MAX_UPLOAD_BYTES = 10_485_760; // 10 MB
export const MAX_TOTAL_UPLOAD_BYTES = 26_214_400; // 25 MB
export const MAX_IMAGE_PIXELS = 4_194_304; // 2048 x 2048
export const MAX_AUDIO_SECONDS = 10;
export const MAX_PLOT_POINTS_RENDERED = 50_000;
export const MAX_PLOT_POINTS_HARD = 200_000;
export const MAX_CONSOLE_LINES = 5_000;
export const MAX_STDOUT_BYTES_PER_RUN = 2_097_152; // 2 MB
export const MAX_WORKSPACE_BYTES = 204_800; // 200 KB
export const MAX_WORKSPACES_PER_USER = 50;
export const MAX_MONTE_CARLO_SYMBOLS = 1_000_000;
