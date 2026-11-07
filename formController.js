// --- formController.js ---
// Envío de registros al servidor. Se usa en la página y en el service worker.

// importScripts solo existe dentro del service worker; en la página db.js ya se cargó con <script>
if (typeof importScripts === "function") {
  importScripts("db.js");
}

const FORM_API_URL = "https://admin-pitahaya.brounieapps.com/api/create/form";
const FORM_API_TOKEN = "goro4vmm.gd3";

/**
 * Manda un registro. Regresa true si el servidor lo aceptó.
 */
async function sendRecord(uuidBase, record) {
  try {
    const response = await fetch(FORM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${FORM_API_TOKEN}`,
      },
      body: JSON.stringify({
        uuid: uuidBase,
        title: typeof getGroupTitle === "function" ? getGroupTitle(uuidBase) : uuidBase,
        data: record,
      }),
    });

    if (response.ok) {
      console.log("✅ Registro enviado:", record.id);
      return true;
    }

    console.error(`❌ Error del servidor [${response.status}] al enviar:`, record.id);
    try {
      console.error("📩 Respuesta del servidor:", await response.text());
    } catch (err) {
      /* sin cuerpo */
    }
    return false;
  } catch (error) {
    // Sin conexión o error de red
    console.warn("⚠️ Sin conexión o error de red:", error.message);
    throw error;
  }
}

// Evita que dos sincronizaciones al mismo tiempo manden el mismo registro dos veces
let syncInProgress = false;

async function sendPendingData() {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const unsyncedData = await getUnsyncedRecords();

    if (Object.keys(unsyncedData).length === 0) {
      console.log("✅ No hay registros pendientes por enviar.");
      return;
    }

    for (const uuidBase in unsyncedData) {
      for (const record of unsyncedData[uuidBase]) {
        let sent;
        try {
          sent = await sendRecord(uuidBase, record);
        } catch (networkError) {
          return; // Sin internet: se reintenta más tarde
        }

        if (sent) {
          // Transacción nueva y corta por cada registro
          await markRecordSent(uuidBase, record.id);
        }
      }
    }

    console.log("🎉 Sincronización terminada.");
  } finally {
    syncInProgress = false;
  }
}