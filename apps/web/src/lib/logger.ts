type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

const REDACTED_KEYS = ["secret", "token", "password", "key", "authorization", "cookie"];

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const isRedacted = REDACTED_KEYS.some((rk) => k.toLowerCase().includes(rk));
    clean[k] = isRedacted ? "[REDACTED]" : sanitize(v);
  }
  return clean;
}

function write(level: LogLevel, payload: LogPayload): void {
  const logObj = {
    timestamp: new Date().toISOString(),
    level,
    message: payload.message,
    ...(payload.context ? { context: sanitize(payload.context) } : {}),
    ...(payload.error instanceof Error
      ? { error: { name: payload.error.name, message: payload.error.message } }
      : payload.error
        ? { error: String(payload.error) }
        : {}),
  };

  const formatted = JSON.stringify(logObj);
  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.info(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    process.env.NODE_ENV !== "production" && write("debug", { message, context }),
  info: (message: string, context?: Record<string, unknown>) =>
    write("info", { message, context }),
  warn: (message: string, context?: Record<string, unknown>) =>
    write("warn", { message, context }),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    write("error", { message, error, context }),
};
