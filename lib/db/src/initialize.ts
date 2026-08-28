import type { DatabaseSync } from "node:sqlite";

const currentWeekDates = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
};

const hasColumn = (sqlite: DatabaseSync, tableName: string, columnName: string): boolean => {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
};

const addColumnIfMissing = (
  sqlite: DatabaseSync,
  tableName: string,
  columnName: string,
  definition: string,
): void => {
  if (!hasColumn(sqlite, tableName, columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const ensureDaycareDefaults = (sqlite: DatabaseSync, childId: number): void => {
  const insertDefault = sqlite.prepare(`
    INSERT INTO daycare_items (child_id, name, category, item_type, recurring, completed, status, note)
    SELECT ?, ?, ?, ?, ?, ?, 'ready', ?
    WHERE NOT EXISTS (
      SELECT 1 FROM daycare_items WHERE child_id = ? AND lower(name) = lower(?)
    )
  `);

  [
    ["Matpakke", "essential", "essential", 1, 0, null],
    ["Vogn", "essential", "essential", 1, 0, null],
    ["Myggnetting", "essential", "essential", 1, 0, null],
    ["Regntrekk", "essential", "essential", 1, 0, null],
    ["Skiftetøy", "clothing", "clothing_stock", 0, 1, "Ha ett komplett skift liggende i barnehagen"],
  ].forEach(([name, category, itemType, recurring, completed, note]) => {
    insertDefault.run(
      childId,
      name,
      category,
      itemType,
      recurring,
      completed,
      note,
      childId,
      name,
    );
  });

  sqlite
    .prepare(`
      UPDATE daycare_items
      SET category = 'clothing',
          item_type = 'clothing_stock',
          recurring = 0,
          completed = CASE WHEN status = 'needs_replacement' THEN 0 ELSE 1 END
      WHERE child_id = ? AND lower(name) = lower('Skiftetøy')
    `)
    .run(childId);
};

export function initializeDatabase(sqlite: DatabaseSync): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      prep_minutes INTEGER NOT NULL,
      servings INTEGER NOT NULL,
      ingredients TEXT NOT NULL,
      steps TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      planned_date TEXT NOT NULL,
      meal_type TEXT NOT NULL DEFAULT 'dinner',
      title TEXT NOT NULL,
      recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      note TEXT,
      UNIQUE(household_id, planned_date, meal_type)
    );

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quantity TEXT,
      category TEXT NOT NULL DEFAULT 'Annet',
      completed INTEGER NOT NULL DEFAULT 0,
      source_recipe_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS home_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT NOT NULL DEFAULT 'normal',
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES home_projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      birth_date TEXT,
      daycare_name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      needs_diapers INTEGER NOT NULL DEFAULT 0,
      last_diaper_delivery_date TEXT DEFAULT '2026-08-28'
    );

    CREATE TABLE IF NOT EXISTS daycare_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      item_type TEXT NOT NULL DEFAULT 'other',
      recurring INTEGER NOT NULL DEFAULT 1,
      checked_on TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ready',
      note TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clothing_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      size TEXT,
      season TEXT,
      location TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS packing_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      destination TEXT,
      departure_date TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packing_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Annet',
      quantity TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      assigned_to TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  addColumnIfMissing(sqlite, "children", "needs_diapers", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "children", "last_diaper_delivery_date", "TEXT DEFAULT '2026-08-28'");
  addColumnIfMissing(sqlite, "daycare_items", "item_type", "TEXT NOT NULL DEFAULT 'other'");
  addColumnIfMissing(sqlite, "daycare_items", "recurring", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(sqlite, "daycare_items", "checked_on", "TEXT");
  addColumnIfMissing(sqlite, "daycare_items", "completed", "INTEGER NOT NULL DEFAULT 0");
  sqlite.exec(`
    UPDATE daycare_items
    SET item_type = CASE
      WHEN lower(category) IN ('klær', 'clothing') THEN 'clothing'
      WHEN lower(category) IN ('fast', 'essential') THEN 'essential'
      ELSE 'other'
    END
    WHERE item_type = 'other' AND lower(category) IN ('klær', 'clothing', 'fast', 'essential');
  `);

  const existing = sqlite
    .prepare("SELECT id FROM households ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;

  if (existing) {
    const child = sqlite
      .prepare("SELECT id FROM children WHERE active = 1 ORDER BY id LIMIT 1")
      .get() as { id: number } | undefined;
    if (child) ensureDaycareDefaults(sqlite, child.id);
    return;
  }

  const household = sqlite
    .prepare("INSERT INTO households (name) VALUES (?) RETURNING id")
    .get("Hjemme") as { id: number };

  const recipeRows = [
    {
      name: "Ovnsbakt laks med sitronpoteter",
      description: "En enkel hverdagsmiddag med laks, grønt og sprø poteter.",
      category: "Hverdag",
      prep: 35,
      servings: 4,
      ingredients: ["4 laksefileter", "800 g småpoteter", "1 sitron", "Brokkoli", "Olivenolje"],
      steps: ["Sett ovnen på 210 °C.", "Vend poteter i olje og stek i 20 minutter.", "Legg laks og brokkoli på brettet, og stek i 12 minutter."],
      favorite: 1,
    },
    {
      name: "Kremet tomatpasta",
      description: "Mild, rask og barnevennlig pasta med spinat.",
      category: "Raskt",
      prep: 20,
      servings: 4,
      ingredients: ["400 g pasta", "1 boks hakkede tomater", "1 dl kremfløte", "Spinat", "Parmesan"],
      steps: ["Kok pastaen.", "La tomater og fløte småkoke.", "Vend inn spinat og pasta. Topp med parmesan."],
      favorite: 1,
    },
    {
      name: "Taco med ovnsbakte grønnsaker",
      description: "Fargerik fredagstaco med ekstra grønt på brettet.",
      category: "Favoritt",
      prep: 30,
      servings: 4,
      ingredients: ["Tortilla", "Kjøttdeig", "Paprika", "Mais", "Avokado", "Tacokrydder"],
      steps: ["Stek grønnsakene i ovnen.", "Brun kjøttdeigen med krydder.", "Sett frem alt og bygg taco ved bordet."],
      favorite: 1,
    },
    {
      name: "Linsegryte med kokosmelk",
      description: "Varm og mettende gryte med røde linser og ingefær.",
      category: "Vegetar",
      prep: 30,
      servings: 4,
      ingredients: ["Røde linser", "Kokosmelk", "Gulrot", "Ingefær", "Curry", "Ris"],
      steps: ["Surr grønnsakene med curry.", "Tilsett linser, kokosmelk og vann.", "La gryten trekke og server med ris."],
      favorite: 0,
    },
  ];

  const insertRecipe = sqlite.prepare(`
    INSERT INTO recipes (household_id, name, description, category, prep_minutes, servings, ingredients, steps, favorite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, name
  `);

  const recipes = recipeRows.map((recipe) =>
    insertRecipe.get(
      household.id,
      recipe.name,
      recipe.description,
      recipe.category,
      recipe.prep,
      recipe.servings,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.favorite,
    ) as { id: number; name: string },
  );

  const planTemplates = [
    { title: recipes[0]!.name, recipeId: recipes[0]!.id },
    { title: recipes[1]!.name, recipeId: recipes[1]!.id },
    { title: "Suppe og godt brød", recipeId: null },
    { title: recipes[3]!.name, recipeId: recipes[3]!.id },
    { title: recipes[2]!.name, recipeId: recipes[2]!.id },
    { title: "Rester eller favoritt", recipeId: null },
    { title: "Pannekaker med bær", recipeId: null },
  ];

  const insertPlan = sqlite.prepare(`
    INSERT INTO meal_plans (household_id, planned_date, meal_type, title, recipe_id, status)
    VALUES (?, ?, 'dinner', ?, ?, 'planned')
  `);

  currentWeekDates().forEach((date, index) => {
    const plan = planTemplates[index]!;
    insertPlan.run(household.id, date, plan.title, plan.recipeId);
  });

  const list = sqlite
    .prepare("INSERT INTO shopping_lists (household_id, name) VALUES (?, ?) RETURNING id")
    .get(household.id, "Denne uken") as { id: number };

  const insertItem = sqlite.prepare(
    "INSERT INTO shopping_items (list_id, name, quantity, category, sort_order) VALUES (?, ?, ?, ?, ?)",
  );
  [
    ["Melk", "2 l", "Meieri"],
    ["Bananer", "1 bunt", "Frukt & grønt"],
    ["Havregryn", "1 pakke", "Tørrvarer"],
    ["Våtservietter", "1 pakke", "Hygiene"],
  ].forEach((item, index) => insertItem.run(list.id, ...item, index));

  const child = sqlite
    .prepare(
      "INSERT INTO children (household_id, name, daycare_name, last_diaper_delivery_date) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .get(household.id, "Barnet", "Barnehagen", "2026-08-28") as { id: number };
  ensureDaycareDefaults(sqlite, child.id);
}