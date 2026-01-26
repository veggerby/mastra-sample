import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { MastraServer } from "@mastra/express";
import { mastra } from "./mastra.js";
import { logger } from "./logger.js";

// Load .env from project root (3 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../../../.env") });

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    const app = express();
    app.use(express.json()); // Required for body parsing

    const server = new MastraServer({ app, mastra });
    await server.init();

    app.use((req, res, next) => {
      const mastra = res.locals.mastra;
      logger.info(
        `${req.method} ${req.url} - Agents: ${Object.keys(mastra.listAgents()).join(", ")}`,
      );
      next();
    });

    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Server started successfully");
      logger.info(`Health: http://localhost:${PORT}/health`);
      logger.info(`API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
}

main();
