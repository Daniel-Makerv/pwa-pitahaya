// --- db.js ---
const DB_NAME = "pitahayaDB";
const DB_VERSION = 1;
const STORE_NAME = "records";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "uuidBase" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const data = {};
      req.result.forEach((item) => {
        data[item.uuidBase] = item.records;
      });
      resolve(data);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveRecord(uuidBase, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getReq = store.get(uuidBase);
    getReq.onsuccess = () => {
      const existing = getReq.result || { uuidBase, records: [] };
      existing.records.push(record);
      store.put(existing);
      resolve(true);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function initRecords() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const defaults = [
    "plantOrEsqueaje",
    "frut",
    "asesoryTec",
    "process",
    "providers",
    "info",
  ];

  defaults.forEach((uuidBase) => {
    const req = store.get(uuidBase);
    req.onsuccess = () => {
      if (!req.result) {
        store.put({ uuidBase, records: [] });
      }
    };
  });
}

async function getUnsyncedRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const result = {};

      // Recorre cada objeto guardado (cada uuidBase)
      req.result.forEach((group) => {
        if (Array.isArray(group.records)) {
          // Filtra los que tengan send_api === false
          const unsynced = group.records.filter((r) => r.send_api === false);

          // Solo guarda si hay registros pendientes
          if (unsynced.length > 0) {
            result[group.uuidBase] = unsynced;
          }
        }
      });

      resolve(result);
    };

    req.onerror = () => reject(req.error);
  });
}
