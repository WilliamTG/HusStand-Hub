import path from "path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.HUSSTAND_DB_PATH ?? "./data/husstand-hub.db",
  },
});
