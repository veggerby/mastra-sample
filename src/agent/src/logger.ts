import pino from "pino";

// Logger must be created before config to avoid circular dependency
// Config values are evaluated lazily when logger methods are called
export const logger = pino({
  get level() {
    return process.env.LOG_LEVEL || "info";
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
