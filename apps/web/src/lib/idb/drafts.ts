import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "vlab_drafts_db";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

export interface LocalDraft {
  experimentId: string;
  code: string;
  params: Record<string, number | string | boolean>;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "experimentId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveLocalDraft(draft: LocalDraft): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") {
      return;
    }
    const db = await getDb();
    await db.put(STORE_NAME, draft);
  } catch {
    // Suppress IndexedDB errors
  }
}

export async function getLocalDraft(experimentId: string): Promise<LocalDraft | null> {
  try {
    if (typeof indexedDB === "undefined") {
      return null;
    }
    const db = await getDb();
    const result = await db.get(STORE_NAME, experimentId);
    return (result as LocalDraft) || null;
  } catch {
    return null;
  }
}

export async function deleteLocalDraft(experimentId: string): Promise<void> {
  try {
    if (typeof indexedDB === "undefined") {
      return;
    }
    const db = await getDb();
    await db.delete(STORE_NAME, experimentId);
  } catch {
    // Suppress IndexedDB errors
  }
}
