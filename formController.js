importScripts("db.js");

async function sendPendingData() {
  const unsyncedData = await getUnsyncedRecords();

  // Si no hay datos pendientes, salimos
  if (Object.keys(unsyncedData).length === 0) {
    console.log("✅ No hay registros pendientes por enviar.");
    return;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  // Recorremos cada grupo (uuidBase)s
  for (const uuidBase in unsyncedData) {
    const records = unsyncedData[uuidBase];

    let token = "goro4vmm.gd3";

    for (const record of records) {
      try {
        const response = await fetch(
          "https://admin-pitahaya.brounieapps.com/api/create/form",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record, uuidBase, token),
          }
        );

        if (response.ok) {
          // 🔹 Si se envió correctamente, marcamos el registro como enviado
          const storedGroup = await store.get(uuidBase);
          storedGroup.onsuccess = () => {
            const groupData = storedGroup.result;
            const index = groupData.records.findIndex(
              (r) => r.id === record.id
            );

            if (index !== -1) {
              groupData.records[index].send_api = true;
              store.put(groupData);
              console.log("✅ Registro sincronizado:", record);
            }
          };
        } else {
          console.error("❌ Error del servidor al sincronizar:", record);
          console.error(response);
        }
      } catch (error) {
        console.warn("⚠️ Sin conexión. Se intentará más tarde.");
        return; // Detenemos para no seguir intentando
      }
    }
  }
}
