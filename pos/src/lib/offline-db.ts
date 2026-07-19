import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { OfflineAction, PendingDraft } from "@/types";

interface PosDB extends DBSchema {
  pending_drafts: {
    key: string;
    value: PendingDraft;
  };
  offline_queue: {
    key: string;
    value: OfflineAction;
    indexes: { "by-synced": number };
  };
  cache: {
    key: string;
    value: { key: string; data: unknown; updated_at: string };
  };
}

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PosDB>("krunchies-pos", 1, {
      upgrade(db) {
        db.createObjectStore("pending_drafts", { keyPath: "id" });
        const queue = db.createObjectStore("offline_queue", { keyPath: "id" });
        queue.createIndex("by-synced", "synced");
        db.createObjectStore("cache", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function saveDraft(draft: PendingDraft) {
  const db = await getDb();
  await db.put("pending_drafts", draft);
}

export async function listDrafts() {
  const db = await getDb();
  return db.getAll("pending_drafts");
}

export async function getDraft(id: string) {
  const db = await getDb();
  return db.get("pending_drafts", id);
}

export async function deleteDraft(id: string) {
  const db = await getDb();
  await db.delete("pending_drafts", id);
}

export async function enqueueAction(
  action: Omit<OfflineAction, "id" | "created_at" | "synced">,
) {
  const db = await getDb();
  const item: OfflineAction = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    synced: false,
    ...action,
  };
  await db.put("offline_queue", item);
  return item;
}

export async function listPendingActions() {
  const db = await getDb();
  const all = await db.getAll("offline_queue");
  return all.filter((a) => !a.synced);
}

export async function markActionSynced(id: string) {
  const db = await getDb();
  const item = await db.get("offline_queue", id);
  if (!item) return;
  item.synced = true;
  await db.put("offline_queue", item);
}

export async function markActionError(id: string, error: string) {
  const db = await getDb();
  const item = await db.get("offline_queue", id);
  if (!item) return;
  item.error = error;
  await db.put("offline_queue", item);
}

export async function cacheSet(key: string, data: unknown) {
  const db = await getDb();
  await db.put("cache", {
    key,
    data,
    updated_at: new Date().toISOString(),
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.get("cache", key);
  return (row?.data as T) ?? null;
}
