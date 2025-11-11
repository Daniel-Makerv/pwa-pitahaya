importScripts("db.js");

// Helpers para trabajar con IndexedDB usando Promesas
function getFromStore(store, key) {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putInStore(store, data) {
  return new Promise((resolve, reject) => {
    const req = store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function sendPendingData() {
  const unsyncedData = await getUnsyncedRecords();

  if (Object.keys(unsyncedData).length === 0) {
    console.log("✅ No hay registros pendientes por enviar.");
    return;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const uuidBase in unsyncedData) {
    const records = unsyncedData[uuidBase];
    const token = "goro4vmm.gd3";

    for (const record of records) {
      try {
        const response = await fetch(
          "https://admin-pitahaya.brounieapps.com/api/create/form",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              uuid: uuidBase,
              data: record,
            }),
          }
        );

        if (response.ok) {
          // ✅ Leer grupo actual desde IndexedDB
          const groupData = await getFromStore(store, uuidBase);
          if (!groupData || !groupData.records) continue;

          // Buscar el registro y marcarlo como enviado
          const index = groupData.records.findIndex((r) => r.id === record.id);

          if (index !== -1) {
            groupData.records[index].send_api = true;
            await putInStore(store, groupData);
            console.log("✅ Registro sincronizado:", record.id);
          }
        } else {
          console.error("❌ Error del servidor al sincronizar:", record.id);
        }
      } catch (error) {
        console.warn("⚠️ Sin conexión. Se intentará más tarde.");
        return; // detener el bucle si no hay conexión
      }
    }
  }

  console.log("🎉 Sincronización completada.");
}
