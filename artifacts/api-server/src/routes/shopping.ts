import { Router, type IRouter } from "express";
import {
  CreateShoppingItemBody,
  CreateShoppingItemResponse,
  DeleteShoppingItemParams,
  ImportWeeklyIngredientsBody,
  ImportWeeklyIngredientsResponse,
  ListShoppingItemsResponse,
  UpdateShoppingItemBody,
  UpdateShoppingItemParams,
  UpdateShoppingItemResponse,
} from "@workspace/api-zod";
import { sqlite } from "@workspace/db";
import { toShoppingItem, type RawShoppingItem } from "./household-helpers";

const router: IRouter = Router();

const normalizeItemName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nb-NO");

const categorizeIngredient = (ingredient: string): string => {
  const value = normalizeItemName(ingredient);
  if (/(melk|fløte|krem|ost|parmesan|smør|yoghurt|rømme)/.test(value)) return "Kjøl";
  if (/(laks|fisk|kjøtt|kylling|pølse|karbonade)/.test(value)) return "Kjøtt & fisk";
  if (/(potet|sitron|brokkoli|spinat|paprika|mais|avokado|gulrot|ingefær|banan|løk|salat|bær)/.test(value)) {
    return "Frukt & grønt";
  }
  if (/(pasta|ris|linse|tortilla|havre|tomat|kokosmelk|curry|krydder|olje|mel|bønne)/.test(value)) {
    return "Tørrvarer";
  }
  return "Annet";
};

const splitIngredient = (ingredient: string): { name: string; quantity: string | null } => {
  const value = ingredient.trim().replace(/\s+/g, " ");
  const match = value.match(
    /^((?:\d+(?:[.,]\d+)?|½|en|ett|to|tre|fire|fem)(?:\s*(?:g|kg|dl|l|ml|stk|pakke(?:r)?|boks(?:er)?|ss|ts))?)\s+(.+)$/iu,
  );

  return match ? { quantity: match[1]!, name: match[2]!.trim() } : { quantity: null, name: value };
};

const getActiveShoppingListId = (): number => {
  const activeList = sqlite
    .prepare("SELECT id FROM shopping_lists WHERE archived = 0 ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  if (activeList) return activeList.id;

  const household = sqlite
    .prepare("SELECT id FROM households ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  if (!household) throw new Error("Fant ikke et aktivt hjem.");

  return (
    sqlite
      .prepare("INSERT INTO shopping_lists (household_id, name) VALUES (?, ?) RETURNING id")
      .get(household.id, "Handleliste") as { id: number }
  ).id;
};

const nextSortOrder = (listId: number): number =>
  (
    sqlite
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order FROM shopping_items WHERE list_id = ?")
      .get(listId) as { sort_order: number }
  ).sort_order;

router.get("/shopping-items", async (_req, res): Promise<void> => {
  const listId = getActiveShoppingListId();
  const items = sqlite
    .prepare(`
      SELECT id, name, quantity, category, completed, source_recipe_id, sort_order
      FROM shopping_items
      WHERE list_id = ?
      ORDER BY completed ASC, category ASC, sort_order ASC, id ASC
    `)
    .all(listId) as unknown as RawShoppingItem[];

  res.json(ListShoppingItemsResponse.parse(items.map(toShoppingItem)));
});

router.post("/shopping-items", async (req, res): Promise<void> => {
  const parsed = CreateShoppingItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const listId = getActiveShoppingListId();
  const created = sqlite
    .prepare(`
      INSERT INTO shopping_items (list_id, name, quantity, category, sort_order)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, name, quantity, category, completed, source_recipe_id, sort_order
    `)
    .get(
      listId,
      parsed.data.name.trim(),
      parsed.data.quantity ?? null,
      parsed.data.category ?? "Annet",
      parsed.data.sortOrder ?? nextSortOrder(listId),
    ) as unknown as RawShoppingItem;

  res.status(201).json(CreateShoppingItemResponse.parse(toShoppingItem(created)));
});

router.patch("/shopping-items/:id", async (req, res): Promise<void> => {
  const params = UpdateShoppingItemParams.safeParse(req.params);
  const body = UpdateShoppingItemBody.safeParse(req.body);
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
    quantity: "quantity",
    category: "category",
    completed: "completed",
    sortOrder: "sort_order",
  };
  const entries = Object.entries(body.data).filter(([key, value]) => key in fieldMap && value !== undefined);
  if (entries.length === 0) {
    res.status(400).json({ error: "Ingen felt å oppdatere." });
    return;
  }

  const values = entries.map(([key, value]): string | number | null => {
    if (key === "completed") return value ? 1 : 0;
    if (key === "name") return String(value).trim();
    return (value as string | number | null) ?? null;
  });
  const updateSql = entries.map(([key]) => `${fieldMap[key]} = ?`).join(", ");
  const updated = sqlite
    .prepare(`
      UPDATE shopping_items
      SET ${updateSql}
      WHERE id = ? AND list_id = ?
      RETURNING id, name, quantity, category, completed, source_recipe_id, sort_order
    `)
    .get(...values, params.data.id, getActiveShoppingListId()) as unknown as RawShoppingItem | undefined;

  if (!updated) {
    res.status(404).json({ error: "Handlelistevaren finnes ikke." });
    return;
  }

  res.json(UpdateShoppingItemResponse.parse(toShoppingItem(updated)));
});

router.delete("/shopping-items/:id", async (req, res): Promise<void> => {
  const params = DeleteShoppingItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const removed = sqlite
    .prepare("DELETE FROM shopping_items WHERE id = ? AND list_id = ? RETURNING id")
    .get(params.data.id, getActiveShoppingListId());
  if (!removed) {
    res.status(404).json({ error: "Handlelistevaren finnes ikke." });
    return;
  }

  res.status(204).send();
});

router.post("/shopping-items/import-week", async (req, res): Promise<void> => {
  const parsed = ImportWeeklyIngredientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const weekStart = parsed.data.weekStart.toISOString().slice(0, 10);
  const endDate = new Date(`${weekStart}T12:00:00`);
  endDate.setDate(endDate.getDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);

  try {
    sqlite.exec("BEGIN IMMEDIATE");
    const listId = getActiveShoppingListId();
    const recipes = sqlite
      .prepare(`
        SELECT recipes.id, recipes.ingredients
        FROM meal_plans
        JOIN recipes ON recipes.id = meal_plans.recipe_id
        WHERE meal_plans.planned_date BETWEEN ? AND ? AND meal_plans.recipe_id IS NOT NULL
        ORDER BY meal_plans.planned_date, meal_plans.id
      `)
      .all(weekStart, weekEnd) as { id: number; ingredients: string }[];
    const activeNames = new Set(
      (
        sqlite
          .prepare("SELECT name FROM shopping_items WHERE list_id = ? AND completed = 0")
          .all(listId) as { name: string }[]
      ).map((item) => normalizeItemName(item.name)),
    );
    const insertItem = sqlite.prepare(`
      INSERT INTO shopping_items (list_id, name, quantity, category, source_recipe_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    let added = 0;
    let skipped = 0;
    let sortOrder = nextSortOrder(listId);

    for (const recipe of recipes) {
      let ingredients: unknown;
      try {
        ingredients = JSON.parse(recipe.ingredients);
      } catch {
        ingredients = [];
      }
      if (!Array.isArray(ingredients)) continue;

      for (const ingredient of ingredients) {
        if (typeof ingredient !== "string" || !ingredient.trim()) continue;
        const { name, quantity } = splitIngredient(ingredient);
        const normalizedName = normalizeItemName(name);
        if (!normalizedName || activeNames.has(normalizedName)) {
          skipped += 1;
          continue;
        }
        insertItem.run(listId, name, quantity, categorizeIngredient(name), recipe.id, sortOrder);
        activeNames.add(normalizedName);
        sortOrder += 1;
        added += 1;
      }
    }

    sqlite.exec("COMMIT");
    res.json(
      ImportWeeklyIngredientsResponse.parse({
        added,
        skipped,
        message:
          added > 0
            ? `${added} ingredienser ble lagt til i handlelisten.`
            : "Alle ingrediensene finnes allerede i handlelisten.",
      }),
    );
  } catch (error) {
    try {
      sqlite.exec("ROLLBACK");
    } catch {
      // The transaction may have failed before it was opened.
    }
    req.log.error({ error }, "Unable to import weekly ingredients");
    res.status(500).json({ error: "Kunne ikke legge ukesmenyen i handlelisten." });
  }
});

export default router;