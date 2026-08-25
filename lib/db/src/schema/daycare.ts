import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { householdsTable } from "./core";

export const childrenTable = sqliteTable("children", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthDate: text("birth_date"),
  daycareName: text("daycare_name"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const daycareItemsTable = sqliteTable("daycare_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  childId: integer("child_id")
    .notNull()
    .references(() => childrenTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("Utstyr"),
  status: text("status").notNull().default("ready"),
  note: text("note"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const clothingItemsTable = sqliteTable("clothing_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  childId: integer("child_id")
    .notNull()
    .references(() => childrenTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  size: text("size"),
  season: text("season"),
  location: text("location"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});