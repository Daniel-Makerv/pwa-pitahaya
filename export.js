document.getElementById("export").addEventListener("click", async () => {
  const data = JSON.parse(localStorage.getItem("recordsData"));

  if (!data) {
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
    info: "Solo Información",
  };

  // Recorremos cada grupo y creamos una hoja si hay registros
  for (const [grupo, registros] of Object.entries(data)) {
    if (registros.length > 0) {
      const titleSheet = titlesSheet[grupo];
      const hoja = XLSX.utils.json_to_sheet(registros);
      XLSX.utils.book_append_sheet(workbook, hoja, titleSheet);
      tieneDatos = true;
    }
  }

  if (!tieneDatos) {
    alert("⚠️ No hay registros guardados en ningún grupo");
    return;
  }

  const nombreArchivo = `registros_pitahaya_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  XLSX.writeFile(workbook, nombreArchivo);
});
