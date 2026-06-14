import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireRequestUser } from "../../auth/user";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, user.id))
      .limit(1);

    const setting = settings[0];
    if (!setting) return res.status(404).json({ error: "Settings not found" });

    return res.json(setting);
  } catch (err) {
    req.log.error({ err }, "GET /settings error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const existing = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, user.id))
      .limit(1);

    let updated;
    if (existing.length === 0) {
      const rows = await db
        .insert(userSettingsTable)
        .values({ userId: user.id, ...parsed.data })
        .returning();
      updated = rows[0];
    } else {
      const rows = await db
        .update(userSettingsTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(userSettingsTable.userId, user.id))
        .returning();
      updated = rows[0];
    }

    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "PUT /settings error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
