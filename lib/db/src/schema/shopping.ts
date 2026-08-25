import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { householdsTable } from "./core";

export const shoppingListsTable = sqliteTable("shopping_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const shoppingItemsTable = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => shoppingListsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  category: text("category").notNull().default("Annet"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  sourceRecipeId: integer("source_recipe_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});