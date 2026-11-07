document.getElementById("export").addEventListener("click", async () => {
  // 🔹 Obtener los datos desde IndexedDB
  const data = await getRecords();

  if (!data || Object.keys(data).length === 0) {
    alert("⚠️ No hay registros para exportar");
    return;
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set();
  let tieneDatos = false;

  // Excel: máximo 31 caracteres, sin \ / ? * [ ] : y sin nombres repetidos
  const sheetName = (title) => {
    let name = String(title).replace(/[\\/?*[\]:]/g, "_").trim().slice(0, 31) || "Hoja";
    let candidate = name;
    let n = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      const suffix = ` (${n++})`;
      candidate = name.slice(0, 31 - suffix.length) + suffix;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  };

  // 🔹 Una hoja por pregunta principal que tenga registros
  for (const [grupo, registros] of Object.entries(data)) {
    if (registros && registros.length > 0) {
      const hoja = XLSX.utils.json_to_sheet(registros);
      XLSX.utils.book_append_sheet(workbook, hoja, sheetName(getGroupTitle(grupo)));
      tieneDatos = true;
    }
  }

  if (!tieneDatos) {
    alert("⚠️ No hay registros guardados en ningún grupo");
    return;
  }

  const nombreArchivo = `registros_pitahaya_${new Date().toISOString().split("T")[0]}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);
});