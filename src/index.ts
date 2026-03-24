import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { loadEnvConfig, type EnvConfig } from "./config/env.js";
import { validateRequiredFields } from "./middleware/validation.js";

const config = loadEnvConfig();

interface AppListener {
  listen(port: number, callback?: () => void): unknown;
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const options = {
    swaggerDefinition: {
      openapi: "3.0.0",
      info: { title: "ChronoPay API", version: "1.0.0" },
    },
    apis: ["./src/routes/*.ts"], // adjust if needed
  };

  const specs = swaggerJsdoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "chronopay-backend" });
  });

  app.get("/api/v1/slots", (_req, res) => {
    res.json({ slots: [] });
  });

  app.post(
    "/api/v1/slots",
    validateRequiredFields(["professional", "startTime", "endTime"]),
    (req, res) => {
      const { professional, startTime, endTime } = req.body;

      res.status(201).json({
        success: true,
        slot: {
          id: 1,
          professional,
          startTime,
          endTime,
        },
      });
    },
  );

  return app;
}

export function startServer(app: AppListener, runtimeConfig: EnvConfig) {
  return app.listen(runtimeConfig.port, () => {
    console.log(`ChronoPay API listening on http://localhost:${runtimeConfig.port}`);
  });
}

const app = createApp();

if (config.nodeEnv !== "test") {
  startServer(app, config);
}

export default app;
