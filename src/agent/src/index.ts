import express from "express";
import { MastraServer } from "@mastra/express";
import { mastra } from "./mastra.js";
import { logger } from "./logger.js";
import { config as appConfig, validateConfig } from "./config.js";

// Validate configuration at startup
validateConfig();

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

    app.listen(appConfig.server.port, () => {
      logger.info(
        { port: appConfig.server.port },
        "Server started successfully",
      );
      logger.info(`Health: http://localhost:${appConfig.server.port}/health`);
      logger.info(`API: http://localhost:${appConfig.server.port}/api`);
    });
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
}

main();
