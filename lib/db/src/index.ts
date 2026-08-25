import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { initializeDatabase } from "./initialize";

const databasePath = resolve(
  process.env.HUSSTAND_DB_PATH ?? "data/husstand-hub.db",
);

mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new DatabaseSync(databasePath);
sqlite.exec("PRAGMA foreign_keys = ON;");
sqlite.exec("PRAGMA journal_mode = WAL;");

initializeDatabase(sqlite);

export const db = drizzle(
  async (query, params, method) => {
    const statement = sqlite.prepare(query);

    if (method === "all") {
      return { rows: statement.all(...params) };
    }

    if (method === "get") {
      const row = statement.get(...params);
      return { rows: row ? [row] : [] };
    }

    const result = statement.run(...params);
    return {
      rows: [],
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  },
  { schema },
);

export * from "./schema";
