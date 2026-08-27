import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatItalianDate } from "@/lib/rental-time";

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 18;

async function buildDocument(title: string, lines: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let y = page.getHeight() - PAGE_MARGIN;

  page.drawText("Fabri GROUP - Fabri Rent Campania", {
    x: PAGE_MARGIN,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= LINE_HEIGHT * 1.5;

  page.drawText(title, { x: PAGE_MARGIN, y, size: 16, font: boldFont });
  y -= LINE_HEIGHT * 2;

  for (const line of lines) {
    if (y < PAGE_MARGIN) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getHeight() - PAGE_MARGIN;
    }
    page.drawText(line, { x: PAGE_MARGIN, y, size: 11, font, maxWidth: 495 });
    y -= LINE_HEIGHT;
  }

  return pdfDoc.save();
}

export async function generateDamageReportPdf(params: {
  bookingId: string;
  vehicleName: string;
  customerName: string;
  notes: string | null;
  photoCount: number;
  createdAt: Date;
}): Promise<Uint8Array> {
  return buildDocument("Report Danni Preesistenti + Contratto di Noleggio", [
    `Prenotazione: ${params.bookingId}`,
    `Cliente: ${params.customerName}`,
    `Veicolo: ${params.vehicleName}`,
    `Data check-in: ${formatItalianDate(params.createdAt)}`,
    `Sede: Via Privata Detta Sacra 33`,
    "",
    `Foto allegate: ${params.photoCount}`,
    "",
    "Note danni preesistenti:",
    params.notes ?? "Nessun danno preesistente rilevato.",
    "",
    "Il presente documento costituisce contratto di noleggio e verbale",
    "fotografico dello stato del veicolo alla consegna.",
  ]);
}

export async function generateDamageTicketPdf(params: {
  bookingId: string;
  vehicleName: string;
  customerName: string;
  description: string;
  depositWithheldAmount: number;
  createdAt: Date;
}): Promise<Uint8Array> {
  return buildDocument("Report Danni al Check-out (Ticket Danno)", [
    `Prenotazione: ${params.bookingId}`,
    `Cliente: ${params.customerName}`,
    `Veicolo: ${params.vehicleName}`,
    `Data check-out: ${formatItalianDate(params.createdAt)}`,
    "",
    "Descrizione danno riscontrato:",
    params.description,
    "",
    `Importo cauzione trattenuto: EUR ${params.depositWithheldAmount.toFixed(2)}`,
    "",
    "Nota: il presente report descrittivo non include documentazione fotografica.",
  ]);
}
