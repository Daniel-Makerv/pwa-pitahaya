async function sendPendingData() {
    const db = await openDB('pwa-database', 1);
    const allData = await db.getAll('pending');
  
    for (const record of allData) {
      try {
        const response = await fetch('https://tuapi.com/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
  
        if (response.ok) {
          await db.delete('pending', record.id);
          console.log('Dato sincronizado y eliminado:', record);
        } else {
          console.error('Error al sincronizar:', record);
        }
      } catch (error) {
        console.warn('Error de conexión, se intentará más tarde');
        break;
      }
    }
  }
  