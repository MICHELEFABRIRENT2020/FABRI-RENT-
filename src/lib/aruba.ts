/**
 * Aruba Fatturazione Elettronica / SDI integration.
 *
 * Without real ARUBA_SDI_API_KEY credentials this deliberately reports a
 * clear "not configured" error rather than pretending the invoice was
 * transmitted - the invoice number, taxable amount, VAT, XML and PDF are
 * still generated for real so nothing here is a dead end. Swap
 * `submitToSdi` for a real Aruba SDI client call once credentials are
 * available (see .env.example).
 */
export type SdiSubmissionResult =
  | { ok: true; sdiReceiptUrl: string }
  | { ok: false; errorMessage: string };

export function buildInvoiceXml(params: {
  invoiceNumber: string;
  companyName: string;
  companyVatNumber: string | null;
  customerName: string;
  customerVatOrFiscalCode: string | null;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  issueDate: Date;
}): string {
  // Minimal FatturaPA-shaped XML skeleton (not schema-validated) so the
  // artifact exists and can be inspected/exported even before a real SDI
  // integration is wired up.
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://www.fatturapa.gov.it/sdi/fatturapa">
  <FatturaElettronicaHeader>
    <CedentePrestatore><Denominazione>${escapeXml(params.companyName)}</Denominazione><PIVA>${escapeXml(params.companyVatNumber ?? "")}</PIVA></CedentePrestatore>
    <CessionarioCommittente><Denominazione>${escapeXml(params.customerName)}</Denominazione><CodiceFiscale>${escapeXml(params.customerVatOrFiscalCode ?? "")}</CodiceFiscale></CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali><Numero>${escapeXml(params.invoiceNumber)}</Numero><Data>${params.issueDate.toISOString().slice(0, 10)}</Data></DatiGenerali>
    <DatiBeniServizi><Imponibile>${params.taxableAmount.toFixed(2)}</Imponibile><Imposta>${params.vatAmount.toFixed(2)}</Imposta><Totale>${params.totalAmount.toFixed(2)}</Totale></DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- xml payload will be sent once a real SDI client is wired up
export async function submitToSdi(xml: string): Promise<SdiSubmissionResult> {
  const apiKey = process.env.ARUBA_SDI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      errorMessage:
        "Integrazione Aruba Fatturazione Elettronica non configurata (ARUBA_SDI_API_KEY mancante). Fattura generata ma non trasmessa allo SDI.",
    };
  }

  // TODO: call the real Aruba SDI API here once credentials are available.
  return { ok: false, errorMessage: "Client Aruba SDI non ancora implementato." };
}
