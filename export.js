document.getElementById("export").addEventListener("click", async () => {
  const registros = await getAllRecords();
  if (!registros.length) { alert("⚠️ No hay registros para exportar"); return; }
  // normalize: remove internal id
  const data = registros.map(r => { const {id, ...rest} = r; return rest; });
  const hoja = XLSX.utils.json_to_sheet(data);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Registros");
  const nombreArchivo = `registros_pitahaya_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(libro, nombreArchivo);
});