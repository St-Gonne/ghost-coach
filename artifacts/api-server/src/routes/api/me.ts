import { Router } from "express";
import { requireRequestUser } from "../../auth/user";

const router = Router();

router.get("/me", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    return res.json(user);
  } catch (err) {
    req.log.error({ err }, "GET /me error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
