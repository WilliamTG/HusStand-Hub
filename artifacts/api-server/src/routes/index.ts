import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import mealPlansRouter from "./meal-plans";
import recipesRouter from "./recipes";
import shoppingRouter from "./shopping";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(mealPlansRouter);
router.use(recipesRouter);
router.use(shoppingRouter);

export default router;
