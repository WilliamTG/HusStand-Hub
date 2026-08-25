import { Router, type IRouter } from "express";
import {
  CreateRecipeBody,
  CreateRecipeResponse,
  DeleteRecipeParams,
  GetRecipeParams,
  GetRecipeResponse,
  ListRecipesQueryParams,
  ListRecipesResponse,
  UpdateRecipeBody,
  UpdateRecipeParams,
  UpdateRecipeResponse,
} from "@workspace/api-zod";
import { sqlite } from "@workspace/db";
import { toRecipe, type RawRecipe } from "./household-helpers";

const router: IRouter = Router();

const recipeById = (id: number): RawRecipe | undefined =>
  sqlite.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as RawRecipe | undefined;

router.get("/recipes", async (req, res): Promise<void> => {
  const parsed = ListRecipesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions: string[] = [];
  const values: string[] = [];
  if (parsed.data.search) {
    conditions.push("(name LIKE ? OR description LIKE ?)");
    values.push(`%${parsed.data.search}%`, `%${parsed.data.search}%`);
  }
  if (parsed.data.category) {
    conditions.push("category = ?");
    values.push(parsed.data.category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const recipes = sqlite
    .prepare(`SELECT * FROM recipes ${where} ORDER BY favorite DESC, name ASC`)
    .all(...values) as unknown as RawRecipe[];
  res.json(ListRecipesResponse.parse(recipes.map(toRecipe)));
});

router.post("/recipes", async (req, res): Promise<void> => {
  const parsed = CreateRecipeBody.safeParse(req.body);
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

  const created = sqlite
    .prepare(`
      INSERT INTO recipes (household_id, name, description, category, prep_minutes, servings, ingredients, steps, favorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    .get(
      household.id,
      parsed.data.name,
      parsed.data.description ?? null,
      parsed.data.category,
      parsed.data.prepMinutes,
      parsed.data.servings,
      JSON.stringify(parsed.data.ingredients),
      JSON.stringify(parsed.data.steps),
      parsed.data.favorite ?? false ? 1 : 0,
    ) as RawRecipe;
  res.status(201).json(CreateRecipeResponse.parse(toRecipe(created)));
});

router.get("/recipes/:id", async (req, res): Promise<void> => {
  const params = GetRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const recipe = recipeById(params.data.id);
  if (!recipe) {
    res.status(404).json({ error: "Oppskriften finnes ikke." });
    return;
  }

  res.json(GetRecipeResponse.parse(toRecipe(recipe)));
});

router.patch("/recipes/:id", async (req, res): Promise<void> => {
  const params = UpdateRecipeParams.safeParse(req.params);
  const body = UpdateRecipeBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const fieldMap: Record<string, string> = {
    name: "name",
    description: "description",
    category: "category",
    prepMinutes: "prep_minutes",
    servings: "servings",
    ingredients: "ingredients",
    steps: "steps",
    favorite: "favorite",
  };
  const entries = Object.entries(body.data).filter(([key]) => key in fieldMap);
  if (entries.length === 0) {
    res.status(400).json({ error: "Ingen felt å oppdatere." });
    return;
  }

  const values: (string | number | null)[] = entries.map(([key, value]) => {
    if (key === "ingredients" || key === "steps") return JSON.stringify(value);
    if (key === "favorite") return value ? 1 : 0;
    if (typeof value === "number" || typeof value === "string") return value;
    return null;
  });
  const updateSql = entries.map(([key]) => `${fieldMap[key]} = ?`).join(", ");
  const updated = sqlite
    .prepare(`UPDATE recipes SET ${updateSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`)
    .get(...values, params.data.id) as RawRecipe | undefined;

  if (!updated) {
    res.status(404).json({ error: "Oppskriften finnes ikke." });
    return;
  }

  res.json(UpdateRecipeResponse.parse(toRecipe(updated)));
});

router.delete("/recipes/:id", async (req, res): Promise<void> => {
  const params = DeleteRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const removed = sqlite.prepare("DELETE FROM recipes WHERE id = ? RETURNING id").get(params.data.id);
  if (!removed) {
    res.status(404).json({ error: "Oppskriften finnes ikke." });
    return;
  }

  res.status(204).send();
});

export default router;