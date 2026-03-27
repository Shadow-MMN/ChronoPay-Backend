import express from "express";
import cors from "cors";
import { validateRequiredFields } from "./middleware/validation";

const app = express();
const PORT = process.env.PORT ?? 3001;

type Slot = {
  id: number;
  professional: string;
  startTime: number;
  endTime: number;
  createdAt: string;
};

const slotStore = new Map<number, Slot>();
let nextSlotId = 1;

const parsePositiveInt = (value: string): number | null => {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// Test-only helper to keep API tests isolated and deterministic.
export const __resetSlotsForTests = () => {
  slotStore.clear();
  nextSlotId = 1;
};

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

app.get("/api/v1/slots", (_req, res) => {
  const slots = Array.from(slotStore.values()).sort((a, b) => a.id - b.id);
  res.json({ slots });
});

app.post(
  "/api/v1/slots",
  validateRequiredFields(["professional", "startTime", "endTime"]),
  (req, res) => {
    const { professional, startTime, endTime } = req.body;

    const normalizedStart = Number(startTime);
    const normalizedEnd = Number(endTime);

    if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
      return res.status(400).json({
        success: false,
        error: "startTime and endTime must be valid numbers",
      });
    }

    if (normalizedStart >= normalizedEnd) {
      return res.status(400).json({
        success: false,
        error: "startTime must be less than endTime",
      });
    }

    const slot: Slot = {
      id: nextSlotId++,
      professional,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      createdAt: new Date().toISOString(),
    };

    slotStore.set(slot.id, slot);

    res.status(201).json({
      success: true,
      slot,
    });
  },
);

/**
 * @swagger
 * /api/v1/slots/{id}:
 *   delete:
 *     summary: Delete a slot
 *     description: Deletes an existing slot if the caller is the slot owner or an admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Slot ID
 *       - in: header
 *         name: x-user-id
 *         required: true
 *         schema:
 *           type: string
 *         description: Caller identity.
 *       - in: header
 *         name: x-role
 *         required: false
 *         schema:
 *           type: string
 *         description: Set to `admin` to bypass owner check.
 *     responses:
 *       200:
 *         description: Slot deleted.
 *       400:
 *         description: Invalid slot ID.
 *       401:
 *         description: Missing caller identity.
 *       403:
 *         description: Caller is not allowed to delete this slot.
 *       404:
 *         description: Slot not found.
 */
app.delete("/api/v1/slots/:id", (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Invalid slot id",
    });
  }

  const slot = slotStore.get(id);
  if (!slot) {
    return res.status(404).json({
      success: false,
      error: "Slot not found",
    });
  }

  const actor = req.header("x-user-id")?.trim();
  const role = req.header("x-role")?.trim().toLowerCase();
  const isAdmin = role === "admin";

  if (!actor && !isAdmin) {
    return res.status(401).json({
      success: false,
      error: "Missing caller identity",
    });
  }

  if (!isAdmin && actor !== slot.professional) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: caller does not own this slot",
    });
  }

  slotStore.delete(id);

  return res.status(200).json({
    success: true,
    deletedSlotId: id,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`ChronoPay API listening on http://localhost:${PORT}`);
  });
}

export default app;
