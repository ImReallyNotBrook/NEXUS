import { describe, expect, it } from "vitest";
import { openNexusDatabase } from "./nexus-database";

function versionedMemoryIndexedDb(): IDBFactory {
  const stores = new Set<string>();
  let version = 0;
  const database = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => { stores.add(name); return {}; },
    close: () => undefined,
  };
  return {
    open: (_name: string, requestedVersion?: number) => {
      const request: Record<string, unknown> = { result: database };
      queueMicrotask(() => {
        const targetVersion = requestedVersion ?? 1;
        if (targetVersion < version) {
          request.error = new DOMException("VersionError", "VersionError");
          (request.onerror as (() => void) | undefined)?.();
          return;
        }
        if (targetVersion > version) {
          version = targetVersion;
          (request.onupgradeneeded as (() => void) | undefined)?.();
        }
        (request.onsuccess as (() => void) | undefined)?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
}

describe("NEXUS IndexedDB schema", () => {
  it("creates paper accounts and market snapshots in one shared database version", async () => {
    const factory = versionedMemoryIndexedDb();
    const database = await openNexusDatabase(factory);
    expect(database.objectStoreNames.contains("paperAccounts")).toBe(true);
    expect(database.objectStoreNames.contains("marketSnapshots")).toBe(true);
    database.close();
  });

  it("shares the same in-flight database open for concurrent adapters", async () => {
    const factory = versionedMemoryIndexedDb();
    const [first, second] = await Promise.all([
      openNexusDatabase(factory),
      openNexusDatabase(factory),
    ]);
    expect(first).toBe(second);
    first.close();
  });
});
