import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/me", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(1);
    const user = users[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    req.log.error({ err }, "GET /me error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
