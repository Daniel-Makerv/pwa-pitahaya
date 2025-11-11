importScripts("db.js");

// Helpers para IndexedDB con promesas
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

        // 🔹 Si la respuesta fue exitosa
        if (response.ok) {
          const groupData = await getFromStore(store, uuidBase);
          if (!groupData || !groupData.records) continue;

          const index = groupData.records.findIndex((r) => r.id === record.id);

          if (index !== -1) {
            groupData.records[index].send_api = true;
            await putInStore(store, groupData);
            console.log("✅ Registro sincronizado:", record.id);
          }
        }
        // 🔹 Si hubo un error HTTP (4xx, 5xx)
        else {
          console.error(
            `❌ Error del servidor [${response.status}] al sincronizar:`,
            record.id
          );

          try {
            const errorText = await response.text();
            console.error("📩 Respuesta del servidor:", errorText);
          } catch (err) {
            console.error("⚠️ No se pudo leer el cuerpo de la respuesta:", err);
          }
        }
      } catch (error) {
        // 🔹 Error de red o sin conexión
        console.warn("⚠️ Sin conexión o error de red:", error.message);
        return; // Detenemos para intentar más tarde
      }
    }
  }

  tx.oncomplete = () => {
    console.log("🎉 Transacción completada correctamente.");
  };

  tx.onerror = (e) => {
    console.error("❌ Error en la transacción IndexedDB:", e.target.error);
  };
}
