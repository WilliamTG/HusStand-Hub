import { sqlite } from "@workspace/db";
import { getActiveChild, getOsloDate } from "./daycare";

export type DaycareClothingView = {
  id: number;
  name: string;
  size: string | null;
  season: string | null;
  location: string | null;
  registeredAt: string | null;
};

export type RawDaycareClothing = {
  id: number;
  name: string;
  size: string | null;
  season: string | null;
  location: string | null;
  registered_at: string | null;
};

export const toCalendarDate = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
};

export const toDaycareClothing = (item: RawDaycareClothing): DaycareClothingView => ({
  id: item.id,
  name: item.name,
  size: item.size,
  season: item.season,
  location: item.location,
  registeredAt: item.registered_at,
});

export const getDaycareClothing = (): DaycareClothingView[] => {
  const child = getActiveChild();
  const items = sqlite
    .prepare(`
      SELECT id, name, size, season, location, registered_at
      FROM clothing_items
      WHERE child_id = ? AND active = 1
      ORDER BY registered_at IS NULL, registered_at DESC, lower(name), id
    `)
    .all(child.id) as unknown as RawDaycareClothing[];

  return items.map(toDaycareClothing);
};

export const getDefaultClothingRegistrationDate = (): string => getOsloDate();