import { sqlite } from "@workspace/db";

export type DaycareCategory = "essential" | "clothing" | "other";

export type DaycareItemView = {
  id: number;
  name: string;
  category: DaycareCategory;
  recurring: boolean;
  checked: boolean;
  completed: boolean;
  needsReplacement: boolean;
  isFixed: boolean;
  note: string | null;
};

export type DaycareSummaryView = {
  date: string;
  childName: string;
  daycareName: string | null;
  items: DaycareItemView[];
  needsDiapers: boolean;
  lastDiaperDeliveryDate: string | null;
  needsClothing: boolean;
  openItemCount: number;
};

type RawChild = {
  id: number;
  name: string;
  daycare_name: string | null;
  needs_diapers: number;
  last_diaper_delivery_date: string | null;
};

type RawDaycareItem = {
  id: number;
  name: string;
  category: string;
  item_type: string;
  recurring: number;
  checked_on: string | null;
  completed: number;
  status: string;
  note: string | null;
};

export const getOsloDate = (value = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string): string => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const getActiveChild = (): RawChild => {
  const child = sqlite
    .prepare(`
      SELECT id, name, daycare_name, needs_diapers, last_diaper_delivery_date
      FROM children
      WHERE active = 1
      ORDER BY id
      LIMIT 1
    `)
    .get() as RawChild | undefined;

  if (!child) throw new Error("Fant ikke et aktivt barnehagebarn.");
  return child;
};

const normalizeCategory = (item: RawDaycareItem): DaycareCategory => {
  const value = (item.item_type || item.category).toLocaleLowerCase("nb-NO");
  if (value === "essential" || value === "fast") return "essential";
  if (value === "clothing" || value === "klær") return "clothing";
  return "other";
};

export const toDaycareItem = (item: RawDaycareItem, today: string): DaycareItemView => {
  const category = normalizeCategory(item);
  const recurring = Boolean(item.recurring);
  const checked = recurring ? item.checked_on === today : Boolean(item.completed);
  const isStoredChange = item.item_type === "clothing_stock";

  return {
    id: item.id,
    name: item.name,
    category,
    recurring,
    checked,
    completed: checked,
    needsReplacement: item.status === "needs_replacement",
    isFixed: category === "essential" || isStoredChange,
    note: item.note,
  };
};

export const getDaycareSummary = (): DaycareSummaryView => {
  const child = getActiveChild();
  const today = getOsloDate();
  const items = (
    sqlite
      .prepare(`
        SELECT id, name, category, item_type, recurring, checked_on, completed, status, note
        FROM daycare_items
        WHERE child_id = ?
        ORDER BY
          CASE item_type WHEN 'essential' THEN 0 WHEN 'clothing' THEN 1 ELSE 2 END,
          id
      `)
      .all(child.id) as unknown as RawDaycareItem[]
  ).map((item) => toDaycareItem(item, today));

  return {
    date: today,
    childName: child.name,
    daycareName: child.daycare_name,
    items,
    needsDiapers: Boolean(child.needs_diapers),
    lastDiaperDeliveryDate: child.last_diaper_delivery_date,
    needsClothing: items.some((item) => item.category === "clothing" && item.needsReplacement),
    openItemCount: items.filter((item) => !item.checked).length,
  };
};
