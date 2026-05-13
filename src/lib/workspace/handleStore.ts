const DB_NAME = "twinpdf-workspace-handles";
const STORE_NAME = "handles";
const LAST_KEY = "last";

type StoredHandle = {
  name: string;
  handle: any;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前浏览器不支持 IndexedDB，无法记住上次的工作区。"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLastWorkspaceHandle(name: string, handle: any) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ name, handle } satisfies StoredHandle, LAST_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadLastWorkspaceHandle(): Promise<StoredHandle | null> {
  const db = await openDb();
  const result = await new Promise<StoredHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(LAST_KEY);
    request.onsuccess = () => resolve((request.result as StoredHandle | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function clearLastWorkspaceHandle() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(LAST_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
