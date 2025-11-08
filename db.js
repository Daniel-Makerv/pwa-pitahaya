const DB_NAME = "pitahayaDB";
const DB_VERSION = 1;
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("registros")) {
        db.createObjectStore("registros", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror = (e) => reject(e);
  });
}
async function saveRecord(data) {
  const database = await openDB();
  return new Promise((res, rej) => {
    const tx = database.transaction("registros", "readwrite");
    const store = tx.objectStore("registros");
    const req = store.add(data);
    req.onsuccess = () => res(req.result);
    req.onerror = (e) => rej(e);
  });
}
async function getAllRecords() {
  const database = await openDB();
  return new Promise((resolve) => {
    const tx = database.transaction("registros", "readonly");
    const store = tx.objectStore("registros");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
}