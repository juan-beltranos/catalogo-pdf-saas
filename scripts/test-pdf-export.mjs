import { mkdir, writeFile } from "node:fs/promises";
import { jsPDF } from "jspdf";

const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true, precision: 12, putOnlyUsedFonts: true });
pdf.setProperties({
  title: "Catálogo de prueba",
  subject: "Validación del exportador profesional",
  author: "Catálogo Instantáneo",
  creator: "Catálogo Instantáneo",
  keywords: "catálogo, productos, PDF",
});

for (let page = 1; page <= 3; page += 1) {
  if (page > 1) pdf.addPage();
  pdf.setFillColor(page === 1 ? 15 : 248, page === 1 ? 23 : 250, page === 1 ? 42 : 252);
  pdf.rect(0, 0, 210, 297, "F");
  pdf.setTextColor(page === 1 ? 255 : 15, page === 1 ? 255 : 23, page === 1 ? 255 : 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(page === 1 ? 28 : 20);
  pdf.text(page === 1 ? "Catalogo Instantaneo" : `Productos - pagina ${page}`, 20, 35);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("Archivo de control para validar formato A4, compresion, metadatos y paginacion.", 20, 50);
}

const pages = pdf.getNumberOfPages();
for (let page = 1; page <= pages; page += 1) {
  pdf.setPage(page); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
  pdf.text(`${page} / ${pages}`, 105, 293.5, { align: "center" });
}

const bytes = Buffer.from(pdf.output("arraybuffer"));
if (bytes.length < 1024 || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("PDF de control inválido");
await mkdir("output/pdf", { recursive: true });
await writeFile("output/pdf/catalogo-exportacion-prueba.pdf", bytes);
console.log(`PDF_OK bytes=${bytes.length} pages=${pages}`);
