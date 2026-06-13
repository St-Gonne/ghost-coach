import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, routinePrescriptionsTable, activityTemplatesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { CreateRoutineBody, UpdateRoutineBody, UpdateRoutineParams } from "@workspace/api-zod";

const router = Router();

async function getFirstUser() {
  const users = await db.select().from(usersTable).limit(1);
  return users[0] ?? null;
}

async function withTemplate(routine: typeof routinePrescriptionsTable.$inferSelect) {
  const templates = await db
    .select()
    .from(activityTemplatesTable)
    .where(eq(activityTemplatesTable.id, routine.activityTemplateId))
    .limit(1);
  return { ...routine, activityTemplate: templates[0] ?? null };
}

router.get("/routines", async (req, res) => {
  try {
    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const routines = await db
      .select()
      .from(routinePrescriptionsTable)
      .where(eq(routinePrescriptionsTable.userId, user.id));

    const enriched = await Promise.all(routines.map(withTemplate));
    return res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "GET /routines error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/routines", async (req, res) => {
  try {
    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = CreateRoutineBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const data = {
      ...parsed.data,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : new Date(),
      reviewAfter: parsed.data.reviewAfter ? new Date(parsed.data.reviewAfter) : null,
    };

    const rows = await db
      .insert(routinePrescriptionsTable)
      .values({ userId: user.id, ...data })
      .returning();

    const routine = rows[0];
    if (!routine) return res.status(500).json({ error: "Failed to create routine" });

    return res.status(201).json(await withTemplate(routine));
  } catch (err) {
    req.log.error({ err }, "POST /routines error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/routines/:id", async (req, res) => {
  try {
    const params = UpdateRoutineParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid ID" });

    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = UpdateRoutineBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }

    const data = {
      ...parsed.data,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined,
      reviewAfter: parsed.data.reviewAfter ? new Date(parsed.data.reviewAfter) : undefined,
    };

    const rows = await db
      .update(routinePrescriptionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(routinePrescriptionsTable.id, params.data.id),
          eq(routinePrescriptionsTable.userId, user.id),
        ),
      )
      .returning();

    if (rows.length === 0) return res.status(404).json({ error: "Routine not found" });
    return res.json(await withTemplate(rows[0]!));
  } catch (err) {
    req.log.error({ err }, "PUT /routines/:id error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
