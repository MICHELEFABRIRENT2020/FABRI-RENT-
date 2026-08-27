import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatItalianDate } from "@/lib/rental-time";

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 18;

async function buildDocument(companyName: string, title: string, lines: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let y = page.getHeight() - PAGE_MARGIN;

  page.drawText(companyName, {
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
  companyName: string;
  location: string;
  bookingId: string;
  vehicleName: string;
  customerName: string;
  notes: string | null;
  photoCount: number;
  createdAt: Date;
}): Promise<Uint8Array> {
  return buildDocument(params.companyName, "Report Danni Preesistenti + Contratto di Noleggio", [
    `Prenotazione: ${params.bookingId}`,
    `Cliente: ${params.customerName}`,
    `Veicolo: ${params.vehicleName}`,
    `Data check-in: ${formatItalianDate(params.createdAt)}`,
    `Sede: ${params.location}`,
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
  companyName: string;
  bookingId: string;
  vehicleName: string;
  customerName: string;
  description: string;
  depositWithheldAmount: number;
  createdAt: Date;
}): Promise<Uint8Array> {
  return buildDocument(params.companyName, "Report Danni al Check-out (Ticket Danno)", [
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

export async function generateRentalContractPdf(params: {
  companyName: string;
  companyVatNumber: string | null;
  location: string;
  contractNumber: number | null;
  bookingId: string;
  customerName: string;
  customerFiscalCode: string | null;
  vehicleName: string;
  plate: string | null;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  depositAmount: number;
  franchigie: { label: string; amount: number; percent: number }[];
  authorizedDrivers: { fullName: string; licenseNumber?: string }[];
}): Promise<Uint8Array> {
  const lines = [
    `Contratto n. ${params.contractNumber ?? params.bookingId}`,
    `Locatore: ${params.companyName}${params.companyVatNumber ? ` - P.IVA ${params.companyVatNumber}` : ""}`,
    `Sede: ${params.location}`,
    "",
    `Locatario: ${params.customerName}${params.customerFiscalCode ? ` - CF ${params.customerFiscalCode}` : ""}`,
    "",
    `Veicolo: ${params.vehicleName}${params.plate ? ` - Targa ${params.plate}` : ""}`,
    `Periodo: dal ${formatItalianDate(params.startDate)} al ${formatItalianDate(params.endDate)}`,
    `Prezzo totale: EUR ${params.totalPrice.toFixed(2)}`,
    `Cauzione: EUR ${params.depositAmount.toFixed(2)}`,
    "",
    "Conducenti autorizzati:",
    ...(params.authorizedDrivers.length > 0
      ? params.authorizedDrivers.map((d) => `- ${d.fullName}${d.licenseNumber ? ` (patente ${d.licenseNumber})` : ""}`)
      : ["- Solo il locatario"]),
    "",
    "Franchigie:",
    ...params.franchigie.map((f) => `- ${f.label}: EUR ${f.amount.toFixed(2)} (${f.percent.toFixed(0)}%)`),
    "",
    "Il locatario dichiara di aver ricevuto il veicolo nello stato descritto nel",
    "verbale fotografico allegato e si impegna alla riconsegna nei termini",
    "pattuiti. Sono a carico del locatario km extra, carburante mancante,",
    "pulizia straordinaria, multe, pedaggi e danni non coperti dalle",
    "franchigie sopra indicate. Furto, incendio, Kasko, RCA e assistenza",
    "stradale sono regolati dalla polizza assicurativa del veicolo.",
    "",
    "Il presente documento e' generato automaticamente a partire dai dati",
    "del contratto e non sostituisce una revisione legale. Si raccomanda",
    "la validazione delle clausole da parte di un professionista abilitato",
    "prima dell'utilizzo commerciale.",
    "",
    "Firma locatario: ___________________________",
  ];

  return buildDocument(params.companyName, "Contratto di Noleggio", lines);
}

export async function generateInvoicePdf(params: {
  companyName: string;
  companyVatNumber: string | null;
  customerName: string;
  customerVatOrFiscalCode: string | null;
  invoiceNumber: string;
  bookingId: string;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  isProforma: boolean;
  createdAt: Date;
}): Promise<Uint8Array> {
  const lines = [
    ...(params.isProforma ? ["** PROFORMA - documento non valido ai fini fiscali **", ""] : []),
    `Numero: ${params.invoiceNumber}`,
    `Data: ${formatItalianDate(params.createdAt)}`,
    `Emittente: ${params.companyName}${params.companyVatNumber ? ` - P.IVA ${params.companyVatNumber}` : ""}`,
    `Cliente: ${params.customerName}${params.customerVatOrFiscalCode ? ` - ${params.customerVatOrFiscalCode}` : ""}`,
    `Riferimento prenotazione: ${params.bookingId}`,
    "",
    `Imponibile: EUR ${params.taxableAmount.toFixed(2)}`,
    `IVA (22%): EUR ${params.vatAmount.toFixed(2)}`,
    `Totale: EUR ${params.totalAmount.toFixed(2)}`,
  ];

  return buildDocument(params.companyName, params.isProforma ? "Proforma" : "Fattura", lines);
}

export async function generateAppealPdf(params: {
  companyName: string;
  companyVatNumber: string | null;
  companyAddress: string | null;
  customerName: string;
  customerFiscalCode: string | null;
  contractNumber: number | null;
  bookingId: string;
  plate: string;
  verbaleNumber: string;
  violationDate: Date;
  issuingAuthorityName: string;
  createdAt: Date;
}): Promise<Uint8Array> {
  const lines = [
    `Spett.le ${params.issuingAuthorityName}`,
    "",
    `Oggetto: Ricorso avverso verbale n. ${params.verbaleNumber} del ${formatItalianDate(params.violationDate)} - targa ${params.plate}`,
    "",
    `Societa': ${params.companyName}${params.companyVatNumber ? ` - P.IVA ${params.companyVatNumber}` : ""}`,
    `Sede: ${params.companyAddress ?? "-"}`,
    "",
    `Il/la sottoscritto/a dichiara che, alla data della violazione, il veicolo targato ${params.plate}`,
    `era condotto da ${params.customerName}${params.customerFiscalCode ? ` (CF ${params.customerFiscalCode})` : ""},`,
    `in forza del contratto di noleggio n. ${params.contractNumber ?? params.bookingId}.`,
    "",
    "Si allegano: copia del contratto di noleggio, copia dei documenti del locatario,",
    "copia del verbale.",
    "",
    "Si richiede pertanto la rettifica dell'intestazione del verbale al soggetto",
    "sopra indicato, quale effettivo conducente del veicolo alla data dei fatti.",
    "",
    `Data: ${formatItalianDate(params.createdAt)}`,
    "",
    "Il presente documento e' generato automaticamente a partire dai dati del",
    "contratto e non sostituisce una revisione legale: si raccomanda la verifica",
    "da parte di un professionista abilitato prima dell'invio.",
    "",
    "Firma: ___________________________",
  ];

  return buildDocument(params.companyName, "Ricorso Verbale", lines);
}
