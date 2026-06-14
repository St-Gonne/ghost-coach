import { Router } from "express";
import { db } from "@workspace/db";
import { activityTemplatesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { CreateActivityBody, UpdateActivityBody, UpdateActivityParams } from "@workspace/api-zod";
import { requireRequestUser } from "../../auth/user";

const router = Router();

router.get("/activities", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    const activities = await db
      .select()
      .from(activityTemplatesTable)
      .where(eq(activityTemplatesTable.userId, user.id))
      .orderBy(activityTemplatesTable.preferenceScore);

    return res.json(activities);
  } catch (err) {
    req.log.error({ err }, "GET /activities error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    const parsed = CreateActivityBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const rows = await db
      .insert(activityTemplatesTable)
      .values({ userId: user.id, ...parsed.data })
      .returning();

    return res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "POST /activities error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/activities/:id", async (req, res) => {
  try {
    const params = UpdateActivityParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid ID" });

    const user = requireRequestUser(req);

    const parsed = UpdateActivityBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const rows = await db
      .update(activityTemplatesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(activityTemplatesTable.id, params.data.id),
          eq(activityTemplatesTable.userId, user.id),
        ),
      )
      .returning();

    if (rows.length === 0) return res.status(404).json({ error: "Activity not found" });
    return res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "PUT /activities/:id error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/activities/:id", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    await db
      .update(activityTemplatesTable)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(activityTemplatesTable.id, req.params.id!),
          eq(activityTemplatesTable.userId, user.id),
        ),
      );

    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "DELETE /activities/:id error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
