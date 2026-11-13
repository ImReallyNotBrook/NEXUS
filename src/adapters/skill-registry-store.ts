import type { SkillRecord } from "../domain/skill-intelligence";
import { SKILL_REGISTRY_STORE, openNexusDatabase } from "./nexus-database";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

/** Local append-only metadata catalogue. It never downloads or executes skill code. */
export class SkillRegistryStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = openNexusDatabase(this.factory).catch((error: unknown) => {
      this.databasePromise = null;
      throw error;
    });
    return this.databasePromise;
  }

  async register(skill: SkillRecord): Promise<void> {
    if (!skill || skill.executable !== false ||
        (skill.status !== "quarantined" && skill.status !== "review-required") ||
        skill.approvedBy !== null || skill.reviewedAt !== null) {
      throw new TypeError("Only unapproved, non-executable skill metadata can be registered");
    }
    const database = await this.openDatabase();
    const transaction = database.transaction(SKILL_REGISTRY_STORE, "readwrite");
    const done = transactionComplete(transaction);
    const request = requestResult(transaction.objectStore(SKILL_REGISTRY_STORE).add(structuredClone(skill)));
    await Promise.all([request, done]);
  }

  async list(limit = 100): Promise<SkillRecord[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw new RangeError("limit must be an integer between 1 and 500");
    }
    const database = await this.openDatabase();
    const transaction = database.transaction(SKILL_REGISTRY_STORE, "readonly");
    const done = transactionComplete(transaction);
    const request = requestResult(
      transaction.objectStore(SKILL_REGISTRY_STORE).getAll() as IDBRequest<SkillRecord[]>,
    );
    const [records] = await Promise.all([request, done]);
    return records.sort((a, b) => b.discoveredAt - a.discoveredAt || a.id.localeCompare(b.id)).slice(0, limit);
  }

  async close(): Promise<void> {
    if (!this.databasePromise) return;
    const database = await this.databasePromise;
    database.close();
    this.databasePromise = null;
  }
}
