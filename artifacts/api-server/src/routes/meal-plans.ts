import { Router, type IRouter } from "express";
import {
  CreateMealPlanBody,
  CreateMealPlanResponse,
  DeleteMealPlanParams,
  ListMealPlansQueryParams,
  ListMealPlansResponse,
  UpdateMealPlanBody,
  UpdateMealPlanParams,
  UpdateMealPlanResponse,
} from "@workspace/api-zod";
import { sqlite } from "@workspace/db";
import { currentWeek, toMealPlan, type RawMealPlan } from "./household-helpers";

const router: IRouter = Router();

const toCalendarDate = (value: string | Date): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;

const plansForRange = (start: string, end: string): RawMealPlan[] =>
  sqlite
    .prepare(`
      SELECT meal_plans.id, meal_plans.planned_date, meal_plans.title, meal_plans.meal_type,
             meal_plans.status, meal_plans.recipe_id, recipes.name AS recipe_name, meal_plans.note
      FROM meal_plans
      LEFT JOIN recipes ON recipes.id = meal_plans.recipe_id
      WHERE meal_plans.planned_date BETWEEN ? AND ?
      ORDER BY meal_plans.planned_date, meal_plans.meal_type
    `)
    .all(start, end) as unknown as RawMealPlan[];

router.get("/meal-plans", async (req, res): Promise<void> => {
  const parsed = ListMealPlansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const defaultWeek = currentWeek();
  const start = parsed.data.weekStart
    ? toCalendarDate(parsed.data.weekStart)
    : defaultWeek.start;
  const endDate = new Date(`${start}T12:00:00`);
  endDate.setDate(endDate.getDate() + 6);
  const end = endDate.toISOString().slice(0, 10);

  res.json(ListMealPlansResponse.parse(plansForRange(start, end).map(toMealPlan)));
});

router.post("/meal-plans", async (req, res): Promise<void> => {
  const parsed = CreateMealPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const household = sqlite
    .prepare("SELECT id FROM households ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  if (!household) {
    res.status(500).json({ error: "Fant ikke et aktivt hjem." });
    return;
  }

  try {
    const created = sqlite
      .prepare(`
        INSERT INTO meal_plans (household_id, planned_date, meal_type, title, recipe_id, status, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING id, planned_date, title, meal_type, status, recipe_id, note
      `)
      .get(
        household.id,
        toCalendarDate(parsed.data.date),
        parsed.data.mealType,
        parsed.data.title,
        parsed.data.recipeId ?? null,
        parsed.data.status ?? "planned",
        parsed.data.note ?? null,
      ) as unknown as Omit<RawMealPlan, "recipe_name">;

    const recipe = created.recipe_id
      ? (sqlite.prepare("SELECT name FROM recipes WHERE id = ?").get(created.recipe_id) as
          | { name: string }
          | undefined)
      : undefined;
    res
      .status(201)
      .json(CreateMealPlanResponse.parse(toMealPlan({ ...created, recipe_name: recipe?.name ?? null })));
  } catch (error) {
    req.log.warn({ error }, "Unable to create meal plan");
    res.status(409).json({ error: "Det finnes allerede en plan for dette måltidet." });
  }
});

router.patch("/meal-plans/:id", async (req, res): Promise<void> => {
  const params = UpdateMealPlanParams.safeParse(req.params);
  const body = UpdateMealPlanBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const fields: Record<string, unknown> = {
    date: "planned_date",
    title: "title",
    mealType: "meal_type",
    status: "status",
    recipeId: "recipe_id",
    note: "note",
  };
  const values = Object.entries(body.data).filter(([key]) => key in fields);
  if (values.length === 0) {
    res.status(400).json({ error: "Ingen felt å oppdatere." });
    return;
  }

  const updateSql = values.map(([key]) => `${fields[key]} = ?`).join(", ");
  const updateValues = values.map(([key, value]): string | number | null => {
    if (key === "date") return toCalendarDate(value as string | Date);
    return (value as string | number | null) ?? null;
  });
  const updated = sqlite
    .prepare(`
      UPDATE meal_plans SET ${updateSql}
      WHERE id = ?
      RETURNING id, planned_date, title, meal_type, status, recipe_id, note
    `)
    .get(...updateValues, params.data.id) as
    | Omit<RawMealPlan, "recipe_name">
    | undefined;

  if (!updated) {
    res.status(404).json({ error: "Middagsplanen finnes ikke." });
    return;
  }

  const recipe = updated.recipe_id
    ? (sqlite.prepare("SELECT name FROM recipes WHERE id = ?").get(updated.recipe_id) as
        | { name: string }
        | undefined)
    : undefined;
  res.json(UpdateMealPlanResponse.parse(toMealPlan({ ...updated, recipe_name: recipe?.name ?? null })));
});

router.delete("/meal-plans/:id", async (req, res): Promise<void> => {
  const params = DeleteMealPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const removed = sqlite
    .prepare("DELETE FROM meal_plans WHERE id = ? RETURNING id")
    .get(params.data.id);
  if (!removed) {
    res.status(404).json({ error: "Middagsplanen finnes ikke." });
    return;
  }

  res.status(204).send();
});

export default router;