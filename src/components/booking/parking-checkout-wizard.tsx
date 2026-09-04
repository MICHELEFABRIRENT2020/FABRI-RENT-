"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { ExtrasSelector, type ExtraSelection } from "@/components/booking/extras-selector";
import { DocumentUploader, type DocumentSlotKey } from "@/components/booking/document-uploader";
import { InvoiceForm, type InvoiceFormValues } from "@/components/booking/invoice-form";
import { useExtraServices, computeExtrasTotalPreview } from "@/lib/hooks/use-extra-services";
import { formatItalianDate } from "@/lib/rental-time";
import type { ParkingCategory, ParkingSlotType } from "@/generated/prisma/client";
import { customerSchema } from "@/lib/validation/booking";

const STEPS = ["Servizi Extra", "Documenti e Fatturazione", "Pagamento"] as const;

// Same schema (and messages) the server uses to validate these fields - a client-side
// gate for UX, not a second source of truth. The server remains authoritative.
const requiredCustomerFields = customerSchema.pick({ fullName: true, email: true, phone: true });

function firstInvalidInvoiceMessage(invoice: InvoiceFormValues): string | null {
  const result = requiredCustomerFields.safeParse(invoice);
  if (result.success) return null;
  return result.error.issues.map((issue) => issue.message).join(" ");
}

const CATEGORY_LABEL: Record<ParkingCategory, string> = { moto: "Moto", auto: "Auto", furgone: "Furgone" };
const SLOT_LABEL: Record<ParkingSlotType, string> = { coperto: "Coperto", scoperto: "Scoperto" };

export function ParkingCheckoutWizard({
  category,
  slotType,
  keysLeft,
  startDate,
  endDate,
  days,
  basePrice,
}: {
  category: ParkingCategory;
  slotType: ParkingSlotType;
  keysLeft: boolean;
  startDate: string;
  endDate: string;
  days: number;
  basePrice: number;
}) {
  const router = useRouter();
  const { extras } = useExtraServices();

  const [step, setStep] = useState(0);
  const [extraSelection, setExtraSelection] = useState<ExtraSelection[]>([]);
  const [documents, setDocuments] = useState<Partial<Record<DocumentSlotKey, string>>>({});
  const [documentsConsent, setDocumentsConsent] = useState(false);
  const [documentsConsentAt, setDocumentsConsentAt] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceFormValues>({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    vatNumber: "",
    sdiCode: "",
    pec: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "debit_card">("credit_card");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ bookingId: string } | null>(null);

  const extrasPreview = useMemo(() => computeExtrasTotalPreview(extras, extraSelection, days), [extras, extraSelection, days]);
  const totalPreview = basePrice + extrasPreview;

  async function handleConfirm() {
    const invoiceError = firstInvalidInvoiceMessage(invoice);
    if (invoiceError) {
      setError(invoiceError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "parking",
          parkingCategory: category,
          parkingType: slotType,
          keysLeft,
          startDate,
          endDate,
          paymentMethod,
          extras: extraSelection,
          customer: { ...invoice, ...documents },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message =
          Array.isArray(data.issues) && data.issues.length > 0
            ? data.issues.map((issue: { message: string }) => issue.message).join(" ")
            : (data.error ?? "Errore nella creazione della prenotazione");
        throw new Error(message);
      }
      setBooking({ bookingId: data.bookingId });
      toast.success("Prenotazione confermata!");
      router.push(`/prenotazioni/${data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setSubmitting(false);
    }
  }

  if (booking) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Prenotazione confermata</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Il pagamento verra&apos; effettuato all&apos;ingresso. Ti stiamo reindirizzando alla tua prenotazione...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="surface-panel">
          <CardHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {STEPS.map((label, i) => {
                  const completed = i < step;
                  const active = i === step;
                  return (
                    <span
                      key={label}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors motion-safe:duration-[var(--motion-fast)] ${
                        active || completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {completed ? <Check className="size-3" aria-hidden="true" /> : `${i + 1}.`} {label}
                    </span>
                  );
                })}
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] motion-safe:duration-[var(--motion-slow)]"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <CardTitle className="pt-2">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent key={step} className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[var(--motion-fast)]">
            {step === 0 && <ExtrasSelector extras={extras} selected={extraSelection} onChange={setExtraSelection} />}

            {step === 1 && (
              <div className="space-y-6">
                <InvoiceForm values={invoice} onChange={setInvoice} />
                <Separator />
                <div>
                  <h4 className="mb-3 text-sm font-semibold">Documenti di identita&apos; (4 file)</h4>
                  <label className="mb-3 flex items-start gap-3 rounded-md border p-3 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5">
                    <Checkbox
                      id="documents-consent"
                      checked={documentsConsent}
                      onCheckedChange={(v) => {
                        const checked = v === true;
                        setDocumentsConsent(checked);
                        setDocumentsConsentAt(checked ? new Date().toISOString() : null);
                      }}
                      className="mt-0.5"
                    />
                    <span className="font-normal text-muted-foreground">
                      Ho letto l&apos;
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        informativa privacy
                      </Link>{" "}
                      relativa al trattamento dei miei dati e dei documenti caricati.
                    </span>
                  </label>
                  {!documentsConsent && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Accetta l&apos;informativa privacy per poter caricare i documenti.
                    </p>
                  )}
                  <DocumentUploader
                    values={documents}
                    onChange={(key, url) => setDocuments((d) => ({ ...d, [key]: url }))}
                    onExtracted={(fields) =>
                      setInvoice((prev) => ({
                        ...prev,
                        fullName: prev.fullName || [fields.firstName, fields.lastName].filter(Boolean).join(" "),
                      }))
                    }
                    consentGiven={documentsConsent}
                    consentTimestamp={documentsConsentAt}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <label className="radio-card flex items-center gap-3 border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="credit_card" />
                  <Label className="font-normal">Carta di Credito</Label>
                </label>
                <label className="radio-card flex items-center gap-3 border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="debit_card" />
                  <Label className="font-normal">Carta di Debito</Label>
                </label>
              </RadioGroup>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Indietro
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  className="h-11"
                  onClick={() => {
                    if (step === 1) {
                      const invoiceError = firstInvalidInvoiceMessage(invoice);
                      if (invoiceError) {
                        setError(invoiceError);
                        return;
                      }
                    }
                    setError(null);
                    setStep((s) => s + 1);
                  }}
                >
                  Avanti
                </Button>
              ) : (
                <Button className="h-11" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? "Attendere..." : "Conferma prenotazione"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="surface-panel sticky top-20">
          <CardHeader>
            <CardTitle className="text-base">Riepilogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              Parcheggio {CATEGORY_LABEL[category]} - {SLOT_LABEL[slotType]}
            </p>
            <p className="text-muted-foreground">{keysLeft ? "Consegna chiavi in sede" : ""}</p>
            <Separator className="my-2" />
            <p className="text-xs font-medium text-muted-foreground">Ingresso: {formatItalianDate(new Date(startDate))}</p>
            <p className="text-xs font-medium text-muted-foreground">Uscita: {formatItalianDate(new Date(endDate))}</p>
            <p className="text-xs font-medium text-muted-foreground">{days} giorni</p>
            <Separator className="my-2" />
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Parcheggio</span>
              <span>EUR {basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Extra</span>
              <span>EUR {extrasPreview.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Totale stimato</span>
              <span className="text-xl font-black tabular-nums text-primary">EUR {totalPreview.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
