import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { routerAgent, generalAgent, weatherAgent } from "./agents/index.js";
import { logger } from "./logger.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// LibSQL storage for conversation threads
const storage = new LibSQLStore({
  id: "mastra-store",
  url:
    process.env.DATABASE_URL ||
    `file:${join(__dirname, "../../../data/app.db")}`,
});

logger.info("Initializing Mastra with agents and workflows");

// Create Mastra instance
export const mastra = new Mastra({
  agents: {
    router: routerAgent,
    general: generalAgent,
    weather: weatherAgent,
  },
  storage,
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});

logger.info("Mastra initialized successfully");
