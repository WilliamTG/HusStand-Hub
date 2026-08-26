type RawMealPlan = {
  id: number;
  planned_date: string;
  title: string;
  meal_type: "dinner" | "lunch" | "breakfast";
  status: "planned" | "cooked" | "skipped";
  recipe_id: number | null;
  recipe_name: string | null;
  note: string | null;
};

type RawRecipe = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  prep_minutes: number;
  servings: number;
  ingredients: string;
  steps: string;
  favorite: number;
};

type RawShoppingItem = {
  id: number;
  name: string;
  quantity: string | null;
  category: string;
  completed: number;
  source_recipe_id: number | null;
  sort_order: number;
};

export const currentWeek = (): { start: string; end: string } => {
  const now = new Date();
  const weekday = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - weekday + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
};

export const toDayLabel = (date: string): string =>
  new Intl.DateTimeFormat("nb-NO", { weekday: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "");

export const toMealPlan = (plan: RawMealPlan) => ({
  id: plan.id,
  date: plan.planned_date,
  dayLabel: toDayLabel(plan.planned_date),
  title: plan.title,
  mealType: plan.meal_type,
  status: plan.status,
  recipeId: plan.recipe_id,
  recipeName: plan.recipe_name,
  note: plan.note,
});

const parseStringList = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
};

export const toRecipe = (recipe: RawRecipe) => ({
  id: recipe.id,
  name: recipe.name,
  description: recipe.description,
  category: recipe.category,
  prepMinutes: recipe.prep_minutes,
  servings: recipe.servings,
  ingredients: parseStringList(recipe.ingredients),
  steps: parseStringList(recipe.steps),
  favorite: Boolean(recipe.favorite),
});

export const toShoppingItem = (item: RawShoppingItem) => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  category: item.category,
  completed: Boolean(item.completed),
  sourceRecipeId: item.source_recipe_id,
  sortOrder: item.sort_order,
});

export type { RawMealPlan, RawRecipe, RawShoppingItem };