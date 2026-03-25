import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { validateRequiredFields } from "./middleware/validation.js";
import { scheduleReminders } from "./services/reminderService.js";
import { startScheduler } from "./scheduler/reminderScheduler.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

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

    const slot = {
      id: Date.now(),
      professional,
      startTime,
      endTime,
    };

    scheduleReminders(slot.id, startTime);

    res.status(201).json({
      success: true,
      slot,
    });
  },
);

if (process.env.NODE_ENV !== "test") {
  startScheduler();

  app.listen(PORT, () => {
    console.log(`ChronoPay API listening on http://localhost:${PORT}`);
  });
}

export default app;
