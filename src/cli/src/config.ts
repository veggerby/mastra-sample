import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadDotenv({ path: join(__dirname, "../../../.env") });

/**
 * CLI Configuration
 *
 * Centralized configuration management for the CLI application.
 * All environment variables are loaded and validated here.
 */
export interface CliConfig {
  /** API configuration */
  api: {
    /** Base URL for Mastra agent API */
    baseUrl: string;
    /** Server port (used for status checks) */
    port: number;
  };

  /** Debug configuration */
  debug: {
    /** Show all chunk types from stream */
    showChunks: boolean;
    /** Show tool arguments and results */
    showTools: boolean;
  };
}

/**
 * Get the CLI configuration
 *
 * Loads configuration from environment variables with sensible defaults.
 *
 * @returns Complete CLI configuration object
 */
function getConfig(): CliConfig {
  return {
    api: {
      baseUrl: process.env.API_URL || "http://localhost:3000",
      port: Number(process.env.PORT) || 3000,
    },

    debug: {
      showChunks:
        process.env.DEBUG_CHUNKS === "1" || process.env.DEBUG_CHUNKS === "true",
      showTools:
        process.env.DEBUG_TOOLS === "1" || process.env.DEBUG_TOOLS === "true",
    },
  };
}

/**
 * Shared configuration instance
 *
 * Import and use this throughout the CLI codebase instead of
 * accessing process.env directly.
 *
 * @example
 * ```typescript
 * import { config } from "./config.js";
 *
 * const apiUrl = config.api.baseUrl;
 * if (config.debug.showTools) {
 *   console.log("Tool debugging enabled");
 * }
 * ```
 */
export const config = getConfig();
