import type { MarketSnapshot, MarketSnapshotCache } from "../domain/market-data";

const DATABASE_NAME = "nexus-local";
const DATABASE_VERSION = 2;
const SNAPSHOT_STORE = "marketSnapshots";

interface StoredSnapshot {
  key: string;
  snapshot: MarketSnapshot;
}

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

export class IndexedDbMarketSnapshotCache implements MarketSnapshotCache {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("paperAccounts")) {
          database.createObjectStore("paperAccounts", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
          database.createObjectStore(SNAPSHOT_STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error("Could not open NEXUS market cache"));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error("NEXUS database upgrade is blocked by another open tab"));
      };
    });
    return this.databasePromise;
  }

  async load(symbol: string, interval: string): Promise<MarketSnapshot | null> {
    const database = await this.openDatabase();
    const transaction = database.transaction(SNAPSHOT_STORE, "readonly");
    const done = transactionComplete(transaction);
    const request = requestResult(
      transaction.objectStore(SNAPSHOT_STORE).get(symbol + "|" + interval) as IDBRequest<StoredSnapshot | undefined>,
    );
    const [record] = await Promise.all([request, done]);
    return record?.snapshot ?? null;
  }

  async save(snapshot: MarketSnapshot): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(SNAPSHOT_STORE, "readwrite");
    const done = transactionComplete(transaction);
    transaction.objectStore(SNAPSHOT_STORE).put({
      key: snapshot.symbol + "|" + snapshot.interval,
      snapshot,
    } satisfies StoredSnapshot);
    await done;
  }

  async close(): Promise<void> {
    if (!this.databasePromise) return;
    const database = await this.databasePromise;
    database.close();
    this.databasePromise = null;
  }
}
