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

  // Recorremos cada grupo (uuidBase)
  for (const uuidBase in unsyncedData) {
    const records = unsyncedData[uuidBase];

    for (const record of records) {
      try {
        const response = await fetch("https://tuapi.com/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

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
        }
      } catch (error) {
        console.warn("⚠️ Sin conexión. Se intentará más tarde.");
        return; // Detenemos para no seguir intentando
      }
    }
  }
}
