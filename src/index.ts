import express from "express";
import cors from "cors";
import { listSlots } from "./services/slotService.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

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

app.get("/api/v1/slots", async (req, res) => {
  try {
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;

    const page = pageRaw === undefined ? undefined : Number(pageRaw);
    const limit = limitRaw === undefined ? undefined : Number(limitRaw);

    const pagination = await listSlots({ page, limit });

    res.json(pagination);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "Invalid page" || err.message === "Invalid limit" || err.message === "Limit exceeds maximum allowed value") {
        return res.status(400).json({ error: err.message });
      }
    }

    res.status(500).json({ error: "Internal server error" });
  }
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

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`ChronoPay API listening on http://localhost:${PORT}`);
  });
}

export default app;
