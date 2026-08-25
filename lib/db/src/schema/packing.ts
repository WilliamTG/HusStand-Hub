import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { householdsTable } from "./core";

export const packingListsTable = sqliteTable("packing_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  destination: text("destination"),
  departureDate: text("departure_date"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const packingItemsTable = sqliteTable("packing_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => packingListsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("Annet"),
  quantity: text("quantity"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  assignedTo: text("assigned_to"),
  sortOrder: integer("sort_order").notNull().default(0),
});