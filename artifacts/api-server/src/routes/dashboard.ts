import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { sqlite } from "@workspace/db";
import { currentWeek, toMealPlan, type RawMealPlan } from "./household-helpers";
import { getDaycareSummary } from "../lib/daycare";

const router: IRouter = Router();

const isoWeekNumber = (date: Date): number => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
};

router.get("/dashboard", async (_req, res): Promise<void> => {
  const { start, end } = currentWeek();
  const menu = sqlite
    .prepare(`
      SELECT meal_plans.id, meal_plans.planned_date, meal_plans.title, meal_plans.meal_type,
             meal_plans.status, meal_plans.recipe_id, recipes.name AS recipe_name, meal_plans.note
      FROM meal_plans
      LEFT JOIN recipes ON recipes.id = meal_plans.recipe_id
      WHERE meal_plans.planned_date BETWEEN ? AND ? AND meal_plans.meal_type = 'dinner'
      ORDER BY meal_plans.planned_date
    `)
    .all(start, end) as unknown as RawMealPlan[];

  const today = new Date().toISOString().slice(0, 10);
  const shoppingPreview = sqlite
    .prepare(`
      SELECT shopping_items.id, shopping_items.name, shopping_items.category, shopping_items.completed
      FROM shopping_items
      JOIN shopping_lists ON shopping_lists.id = shopping_items.list_id
       WHERE shopping_lists.archived = 0 AND shopping_items.completed = 0
       ORDER BY shopping_items.sort_order, shopping_items.id
       LIMIT 5
    `)
    .all()
    .map((item) => ({
      ...(item as { id: number; name: string; category: string; completed: number }),
      completed: Boolean((item as { completed: number }).completed),
    }));

  const daycare = getDaycareSummary();
  const lastDiaperDelivery = daycare.lastDiaperDeliveryDate
    ? new Intl.DateTimeFormat("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(`${daycare.lastDiaperDeliveryDate}T12:00:00`))
    : null;
  const nurseryStatus = daycare.needsDiapers
    ? {
        label: "Barnehagen trenger bleier",
        detail: lastDiaperDelivery
          ? `Sist levert ${lastDiaperDelivery}`
          : "Barnehagen har bedt om påfyll",
        tone: "attention" as const,
      }
    : daycare.needsClothing
      ? {
          label: "Skiftetøy må fylles på",
          detail: "Husk et nytt komplett skift",
          tone: "attention" as const,
        }
      : daycare.openItemCount > 0
        ? {
            label: "Morgensjekk gjenstår",
            detail: `${daycare.openItemCount} ting må sjekkes før avreise`,
            tone: "neutral" as const,
          }
        : {
            label: "Barnehagen er klar",
            detail: "Alt på morgenlisten er sjekket",
            tone: "ok" as const,
          };

  const dateLabel = new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${today}T12:00:00`));

  res.json(
    GetDashboardResponse.parse({
      dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
      weekLabel: `Uke ${isoWeekNumber(new Date(`${today}T12:00:00`))}`,
      todayMeal: menu.find((plan) => plan.planned_date === today)
        ? toMealPlan(menu.find((plan) => plan.planned_date === today)!)
        : null,
      weekMenu: menu.map(toMealPlan),
      shoppingPreview,
      nurseryStatus,
    }),
  );
});

export default router;