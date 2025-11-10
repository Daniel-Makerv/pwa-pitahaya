document.getElementById("export").addEventListener("click", async () => {
  // 🔹 Obtener los datos desde IndexedDB
  const data = await getRecords(); // usando la función del helper db.js

  if (!data || Object.keys(data).length === 0) {
    alert("⚠️ No hay registros para exportar");
    return;
  }

  const workbook = XLSX.utils.book_new();
  let tieneDatos = false;

  const titlesSheet = {
    plantOrEsqueaje: "Planta_Esqueaje",
    frut: "Fruta_Fresca_Registro",
    asesoryTec: "Productor_Asesoria_Registro",
    process: "Procesado_Registro",
    providers: "Proveedores_Alianzas_Registro",
    info: "Solo_Información",
  };

  // 🔹 Recorremos cada grupo y creamos una hoja si hay registros
  for (const [grupo, registros] of Object.entries(data)) {
    if (registros && registros.length > 0) {
      const titleSheet = titlesSheet[grupo] || grupo;
      const hoja = XLSX.utils.json_to_sheet(registros);
      XLSX.utils.book_append_sheet(workbook, hoja, titleSheet);
      tieneDatos = true;
    }
  }

  if (!tieneDatos) {
    alert("⚠️ No hay registros guardados en ningún grupo");
    return;
  }

  // 🔹 Generar el nombre del archivo
  const nombreArchivo = `registros_pitahaya_${new Date()
    .toISOString()
    .split("T")[0]}.xlsx`;

  // 🔹 Exportar el Excel
  XLSX.writeFile(workbook, nombreArchivo);
});
