import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { householdsTable } from "./core";

export const homeProjectsTable = sqliteTable("home_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("normal"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const projectTasksTable = sqliteTable("project_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => homeProjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  dueDate: text("due_date"),
  sortOrder: integer("sort_order").notNull().default(0),
});