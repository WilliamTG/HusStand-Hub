import { Router, type IRouter } from "express";
import {
  CreateDaycareItemBody,
  CreateDaycareItemResponse,
  CreateDaycareClothingBody,
  CreateDaycareClothingResponse,
  DeleteDaycareClothingParams,
  DeleteDaycareItemParams,
  GetDaycareResponse,
  ListDaycareClothesResponse,
  UpdateDaycareClothingBody,
  UpdateDaycareClothingParams,
  UpdateDaycareClothingResponse,
  UpdateDaycareItemBody,
  UpdateDaycareItemParams,
  UpdateDaycareItemResponse,
  UpdateDaycareStatusBody,
  UpdateDaycareStatusResponse,
} from "@workspace/api-zod";
import { sqlite } from "@workspace/db";
import {
  getActiveChild,
  getDaycareSummary,
  getOsloDate,
  toDaycareItem,
  type DaycareCategory,
} from "../lib/daycare";
import {
  getDaycareClothing,
  toCalendarDate,
  toDaycareClothing,
  getDefaultClothingRegistrationDate,
  type RawDaycareClothing,
} from "../lib/daycare-clothing";

const router: IRouter = Router();

const isPresent = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

const toStoredCategory = (category: DaycareCategory): DaycareCategory => category;

router.get("/daycare", async (_req, res): Promise<void> => {
  res.json(GetDaycareResponse.parse(getDaycareSummary()));
});

router.get("/daycare-clothes", async (_req, res): Promise<void> => {
  res.json(ListDaycareClothesResponse.parse(getDaycareClothing()));
});

router.post("/daycare-clothes", async (req, res): Promise<void> => {
  const parsed = CreateDaycareClothingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Navn på klærne må fylles ut." });
    return;
  }

  const child = getActiveChild();
  const created = sqlite
    .prepare(`
      INSERT INTO clothing_items (child_id, name, size, season, location, registered_at)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id, name, size, season, location, registered_at
    `)
    .get(
      child.id,
      name,
      parsed.data.size?.trim() || null,
      parsed.data.season?.trim() || null,
      parsed.data.location?.trim() || null,
      toCalendarDate(parsed.data.registeredAt) ?? getDefaultClothingRegistrationDate(),
    ) as unknown as RawDaycareClothing;

  res.status(201).json(CreateDaycareClothingResponse.parse(toDaycareClothing(created)));
});

router.patch("/daycare-clothes/:id", async (req, res): Promise<void> => {
  const params = UpdateDaycareClothingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDaycareClothingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const child = getActiveChild();
  const current = sqlite
    .prepare(`
      SELECT id, name, size, season, location, registered_at
      FROM clothing_items
      WHERE id = ? AND child_id = ? AND active = 1
    `)
    .get(params.data.id, child.id) as RawDaycareClothing | undefined;

  if (!current) {
    res.status(404).json({ error: "Klærne ble ikke funnet i barnehagebeholdningen." });
    return;
  }

  const assignments: string[] = [];
  const values: Array<string | null> = [];
  const input = parsed.data;

  if (isPresent(input, "name")) {
    const name = input.name!.trim();
    if (!name) {
      res.status(400).json({ error: "Navn på klærne må fylles ut." });
      return;
    }
    assignments.push("name = ?");
    values.push(name);
  }
  if (isPresent(input, "size")) {
    assignments.push("size = ?");
    values.push(input.size?.trim() || null);
  }
  if (isPresent(input, "season")) {
    assignments.push("season = ?");
    values.push(input.season?.trim() || null);
  }
  if (isPresent(input, "location")) {
    assignments.push("location = ?");
    values.push(input.location?.trim() || null);
  }
  if (isPresent(input, "registeredAt")) {
    assignments.push("registered_at = ?");
    values.push(toCalendarDate(input.registeredAt));
  }

  if (assignments.length > 0) {
    sqlite
      .prepare(`UPDATE clothing_items SET ${assignments.join(", ")} WHERE id = ? AND child_id = ?`)
      .run(...values, params.data.id, child.id);
  }

  const updated = sqlite
    .prepare(`
      SELECT id, name, size, season, location, registered_at
      FROM clothing_items
      WHERE id = ? AND child_id = ? AND active = 1
    `)
    .get(params.data.id, child.id) as RawDaycareClothing;

  res.json(UpdateDaycareClothingResponse.parse(toDaycareClothing(updated)));
});

router.delete("/daycare-clothes/:id", async (req, res): Promise<void> => {
  const params = DeleteDaycareClothingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const child = getActiveChild();
  const result = sqlite
    .prepare("UPDATE clothing_items SET active = 0 WHERE id = ? AND child_id = ? AND active = 1")
    .run(params.data.id, child.id);

  if (result.changes === 0) {
    res.status(404).json({ error: "Klærne ble ikke funnet i barnehagebeholdningen." });
    return;
  }

  res.status(204).send();
});

router.post("/daycare-items", async (req, res): Promise<void> => {
  const parsed = CreateDaycareItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const child = getActiveChild();
  const category = toStoredCategory(parsed.data.category);
  const created = sqlite
    .prepare(`
      INSERT INTO daycare_items (child_id, name, category, item_type, recurring, status, note)
      VALUES (?, ?, ?, ?, ?, 'ready', ?)
      RETURNING id, name, category, item_type, recurring, checked_on, completed, status, note
    `)
    .get(
      child.id,
      parsed.data.name.trim(),
      category,
      category,
      parsed.data.recurring ?? true ? 1 : 0,
      parsed.data.note ?? null,
    ) as unknown as Parameters<typeof toDaycareItem>[0];

  res.status(201).json(CreateDaycareItemResponse.parse(toDaycareItem(created, getOsloDate())));
});

router.patch("/daycare-items/:id", async (req, res): Promise<void> => {
  const params = UpdateDaycareItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDaycareItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const child = getActiveChild();
  const current = sqlite
    .prepare(`
      SELECT id, name, category, item_type, recurring, checked_on, completed, status, note
      FROM daycare_items
      WHERE id = ? AND child_id = ?
    `)
    .get(params.data.id, child.id) as Parameters<typeof toDaycareItem>[0] | undefined;

  if (!current) {
    res.status(404).json({ error: "Barnehagepunktet ble ikke funnet." });
    return;
  }

  const today = getOsloDate();
  const nextRecurring = parsed.data.recurring ?? Boolean(current.recurring);
  const currentChecked = nextRecurring
    ? current.checked_on === today
    : Boolean(current.completed);
  let nextChecked = parsed.data.checked ?? currentChecked;
  if (
    isPresent(parsed.data, "needsReplacement") &&
    !nextRecurring &&
    !isPresent(parsed.data, "checked")
  ) {
    nextChecked = !parsed.data.needsReplacement;
  }
  const assignments: string[] = [];
  const values: Array<string | number | null> = [];

  if (isPresent(parsed.data, "name")) {
    assignments.push("name = ?");
    values.push(parsed.data.name!.trim());
  }
  if (isPresent(parsed.data, "category")) {
    const category = toStoredCategory(parsed.data.category!);
    assignments.push("category = ?", "item_type = ?");
    values.push(category, category);
  }
  if (isPresent(parsed.data, "recurring")) {
    assignments.push("recurring = ?");
    values.push(nextRecurring ? 1 : 0);
  }
  if (isPresent(parsed.data, "note")) {
    assignments.push("note = ?");
    values.push(parsed.data.note ?? null);
  }
  if (isPresent(parsed.data, "needsReplacement")) {
    assignments.push("status = ?");
    values.push(parsed.data.needsReplacement ? "needs_replacement" : "ready");
  }
  if (
    isPresent(parsed.data, "checked") ||
    isPresent(parsed.data, "recurring") ||
    (isPresent(parsed.data, "needsReplacement") && !nextRecurring)
  ) {
    assignments.push("checked_on = ?", "completed = ?");
    values.push(nextChecked && nextRecurring ? today : null, nextChecked && !nextRecurring ? 1 : 0);
  }

  if (assignments.length > 0) {
    assignments.push("updated_at = CURRENT_TIMESTAMP");
    sqlite
      .prepare(`UPDATE daycare_items SET ${assignments.join(", ")} WHERE id = ? AND child_id = ?`)
      .run(...values, params.data.id, child.id);
  }

  const updated = sqlite
    .prepare(`
      SELECT id, name, category, item_type, recurring, checked_on, completed, status, note
      FROM daycare_items WHERE id = ? AND child_id = ?
    `)
    .get(params.data.id, child.id) as Parameters<typeof toDaycareItem>[0];

  res.json(UpdateDaycareItemResponse.parse(toDaycareItem(updated, today)));
});

router.delete("/daycare-items/:id", async (req, res): Promise<void> => {
  const params = DeleteDaycareItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const child = getActiveChild();
  const result = sqlite
    .prepare("DELETE FROM daycare_items WHERE id = ? AND child_id = ?")
    .run(params.data.id, child.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Barnehagepunktet ble ikke funnet." });
    return;
  }
  res.sendStatus(204);
});

router.patch("/daycare-status", async (req, res): Promise<void> => {
  const parsed = UpdateDaycareStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!isPresent(parsed.data, "needsDiapers") && !isPresent(parsed.data, "lastDiaperDeliveryDate")) {
    res.status(400).json({ error: "Minst én barnehagestatus må oppgis." });
    return;
  }

  const child = getActiveChild();
  const nextNeedsDiapers = parsed.data.needsDiapers;
  const dateWasProvided = isPresent(parsed.data, "lastDiaperDeliveryDate");
  let nextDeliveryDate = parsed.data.lastDiaperDeliveryDate
    ? toCalendarDate(parsed.data.lastDiaperDeliveryDate)
    : parsed.data.lastDiaperDeliveryDate;

  if (
    nextNeedsDiapers === false &&
    Boolean(child.needs_diapers) &&
    !dateWasProvided
  ) {
    nextDeliveryDate = getOsloDate();
  }

  const assignments: string[] = [];
  const values: Array<string | number | null> = [];
  if (isPresent(parsed.data, "needsDiapers")) {
    assignments.push("needs_diapers = ?");
    values.push(nextNeedsDiapers ? 1 : 0);
  }
  if (dateWasProvided || nextDeliveryDate !== undefined) {
    assignments.push("last_diaper_delivery_date = ?");
    values.push(nextDeliveryDate ?? null);
  }

  sqlite
    .prepare(`UPDATE children SET ${assignments.join(", ")} WHERE id = ?`)
    .run(...values, child.id);

  res.json(UpdateDaycareStatusResponse.parse(getDaycareSummary()));
});

export default router;
