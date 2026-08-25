import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { householdsTable } from "./core";

export const recipesTable = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  prepMinutes: integer("prep_minutes").notNull(),
  servings: integer("servings").notNull(),
  ingredients: text("ingredients").notNull(),
  steps: text("steps").notNull(),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const mealPlansTable = sqliteTable(
  "meal_plans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    householdId: integer("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    plannedDate: text("planned_date").notNull(),
    mealType: text("meal_type").notNull().default("dinner"),
    title: text("title").notNull(),
    recipeId: integer("recipe_id").references(() => recipesTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("planned"),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("meal_plan_household_date_type").on(
      table.householdId,
      table.plannedDate,
      table.mealType,
    ),
  ],
);

export type Recipe = typeof recipesTable.$inferSelect;
export type MealPlan = typeof mealPlansTable.$inferSelect;