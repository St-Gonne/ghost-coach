import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, locationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  CreateLocationBody,
  UpdateLocationBody,
  UpdateLocationParams,
  SetCurrentLocationBody,
} from "@workspace/api-zod";

const router = Router();

async function getFirstUser() {
  const users = await db.select().from(usersTable).limit(1);
  return users[0] ?? null;
}

router.get("/locations", async (req, res) => {
  try {
    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const locations = await db
      .select()
      .from(locationsTable)
      .where(eq(locationsTable.userId, user.id))
      .orderBy(locationsTable.label);

    return res.json(locations);
  } catch (err) {
    req.log.error({ err }, "GET /locations error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/locations", async (req, res) => {
  try {
    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = CreateLocationBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const rows = await db
      .insert(locationsTable)
      .values({ userId: user.id, ...parsed.data })
      .returning();

    return res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "POST /locations error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/locations/:id", async (req, res) => {
  try {
    const params = UpdateLocationParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid ID" });

    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = UpdateLocationBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const rows = await db
      .update(locationsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(eq(locationsTable.id, params.data.id), eq(locationsTable.userId, user.id)),
      )
      .returning();

    if (rows.length === 0) return res.status(404).json({ error: "Location not found" });
    return res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "PUT /locations/:id error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/locations/current", async (req, res) => {
  try {
    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = SetCurrentLocationBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    await db
      .update(locationsTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(locationsTable.userId, user.id));

    const rows = await db
      .update(locationsTable)
      .set({ isDefault: true, lastConfirmedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(locationsTable.id, parsed.data.locationId),
          eq(locationsTable.userId, user.id),
        ),
      )
      .returning();

    if (rows.length === 0) return res.status(404).json({ error: "Location not found" });
    return res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "POST /locations/current error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
