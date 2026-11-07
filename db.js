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

/**
 * Agrega un registro al grupo. Si el grupo no existe (por ejemplo, una pregunta
 * principal nueva que llegó de la API), lo crea.
 */
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
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Marca un registro como enviado. Usa su propia transacción corta:
 * no se puede mantener una transacción abierta mientras se espera un fetch.
 */
async function markRecordSent(uuidBase, recordId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    let updated = false;

    const getReq = store.get(uuidBase);
    getReq.onsuccess = () => {
      const group = getReq.result;
      if (!group || !Array.isArray(group.records)) return;

      const record = group.records.find((r) => r.id === recordId);
      if (!record) return;

      record.send_api = true;
      store.put(group);
      updated = true;
    };

    tx.oncomplete = () => resolve(updated);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Al abrir la app: le pone id a los registros viejos que no tenían,
 * para que la sincronización pueda marcarlos como enviados.
 */
async function initRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      req.result.forEach((group) => {
        if (!Array.isArray(group.records)) return;

        let changed = false;
        group.records.forEach((r) => {
          if (!r.id) {
            r.id = crypto.randomUUID();
            changed = true;
          }
        });

        if (changed) store.put(group);
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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

      req.result.forEach((group) => {
        if (Array.isArray(group.records)) {
          const unsynced = group.records.filter((r) => r.send_api === false && r.id);
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