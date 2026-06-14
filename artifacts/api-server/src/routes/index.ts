import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./api/auth";
import meRouter from "./api/me";
import settingsRouter from "./api/settings";
import activitiesRouter from "./api/activities";
import locationsRouter from "./api/locations";
import routinesRouter from "./api/routines";
import todayRouter from "./api/today";
import weekRouter from "./api/week";
import debugRouter from "./api/debug";
import integrationsRouter from "./api/integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(settingsRouter);
router.use(activitiesRouter);
router.use(locationsRouter);
router.use(routinesRouter);
router.use(todayRouter);
router.use(weekRouter);
router.use(debugRouter);
router.use(integrationsRouter);

export default router;
