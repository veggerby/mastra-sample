import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadDotenv({ path: join(__dirname, "../../../.env") });

/**
 * Agent Server Configuration
 *
 * Centralized configuration management for the agent server.
 * All environment variables are loaded and validated here.
 */
export interface AgentConfig {
  /** Server configuration */
  server: {
    /** Port number for HTTP server */
    port: number;
  };

  /** Database configuration */
  database: {
    /** Primary database connection string */
    url: string;
    /** Vector database connection string */
    vectorUrl: string;
  };

  /** Knowledge base configuration */
  knowledgeBase: {
    /** Path to knowledge base directory */
    path: string;
  };

  /** Logging configuration */
  logging: {
    /** Log level (debug, info, warn, error) */
    level: string;
    /** Pretty print logs in development */
    pretty: boolean;
  };

  /** Environment */
  env: {
    /** Node environment (development, production) */
    nodeEnv: string;
    /** Is production environment */
    isProduction: boolean;
    /** Is development environment */
    isDevelopment: boolean;
  };

  /** API Keys (optional, can be undefined if not set) */
  apiKeys: {
    /** OpenAI API key for LLM and embeddings */
    openai?: string;
  };
}

/**
 * Get the agent server configuration
 *
 * Loads configuration from environment variables with sensible defaults.
 * All paths are resolved relative to the project root.
 *
 * @returns Complete agent configuration object
 */
function getConfig(): AgentConfig {
  const nodeEnv = process.env.NODE_ENV || "development";
  const projectRoot = join(__dirname, "../../..");

  return {
    server: {
      port: Number(process.env.PORT) || 3000,
    },

    database: {
      url:
        process.env.DATABASE_URL || `file:${join(projectRoot, "data/app.db")}`,
      vectorUrl:
        process.env.VECTOR_DATABASE_URL ||
        process.env.DATABASE_URL ||
        `file:${join(projectRoot, "data/rag.db")}`,
    },

    knowledgeBase: {
      path: process.env.KNOWLEDGE_BASE_PATH || join(projectRoot, "knowledge/"),
    },

    logging: {
      level: process.env.LOG_LEVEL || "info",
      pretty: nodeEnv !== "production",
    },

    env: {
      nodeEnv,
      isProduction: nodeEnv === "production",
      isDevelopment: nodeEnv === "development",
    },

    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
    },
  };
}

/**
 * Shared configuration instance
 *
 * Import and use this throughout the agent codebase instead of
 * accessing process.env directly.
 *
 * @example
 * ```typescript
 * import { config } from "./config.js";
 *
 * const port = config.server.port;
 * const dbUrl = config.database.url;
 * ```
 */
export const config = getConfig();

/**
 * Validate required configuration
 *
 * Throws an error if critical configuration is missing.
 * Call this at application startup to fail fast.
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.apiKeys.openai) {
    errors.push("OPENAI_API_KEY is required");
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}
