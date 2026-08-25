import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const householdsTable = sqliteTable("households", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export type Household = typeof householdsTable.$inferSelect;