import type { PaperAccount } from "../domain/paper-broker";

const DATABASE_NAME = "nexus-local";
const DATABASE_VERSION = 2;
const ACCOUNT_STORE = "paperAccounts";
const DEFAULT_ACCOUNT_ID = "default";\nconst CANDLE_STORE = "marketSnapshots";

interface StoredPaperAccount {
  id: string;
  account: PaperAccount;
  updatedAt: number;
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

export class PaperAccountStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly factory: IDBFactory = indexedDB,
    private readonly accountId = DEFAULT_ACCOUNT_ID,
  ) {}

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(ACCOUNT_STORE)) {
          database.createObjectStore(ACCOUNT_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(CANDLE_STORE)) {
          database.createObjectStore(CANDLE_STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error("Could not open NEXUS local database"));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error("NEXUS database upgrade is blocked by another open tab"));
      };
    });
    return this.databasePromise;
  }

  async load(): Promise<PaperAccount | null> {
    const database = await this.openDatabase();
    const transaction = database.transaction(ACCOUNT_STORE, "readonly");
    const done = transactionComplete(transaction);
    const recordPromise = requestResult(
      transaction.objectStore(ACCOUNT_STORE).get(this.accountId) as IDBRequest<StoredPaperAccount | undefined>,
    );
    const [record] = await Promise.all([recordPromise, done]);
    return record?.account ?? null;
  }

  async save(account: PaperAccount): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(ACCOUNT_STORE, "readwrite");
    const done = transactionComplete(transaction);
    transaction.objectStore(ACCOUNT_STORE).put({
      id: this.accountId,
      account,
      updatedAt: Date.now(),
    } satisfies StoredPaperAccount);
    await done;
  }

  async close(): Promise<void> {
    if (!this.databasePromise) return;
    const database = await this.databasePromise;
    database.close();
    this.databasePromise = null;
  }
}
