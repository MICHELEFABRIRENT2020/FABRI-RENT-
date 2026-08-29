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
import { InsuranceSelector, type InsuranceOptionDto } from "@/components/booking/insurance-selector";
import { ExtrasSelector, type ExtraSelection } from "@/components/booking/extras-selector";
import { DocumentUploader, type DocumentSlotKey } from "@/components/booking/document-uploader";
import { InvoiceForm, type InvoiceFormValues } from "@/components/booking/invoice-form";
import { useExtraServices, computeExtrasTotalPreview } from "@/lib/hooks/use-extra-services";
import { formatItalianDate } from "@/lib/rental-time";
import { isKasko } from "@/lib/insurance-zone";
import { VehicleCategoryIcon } from "@/components/booking/vehicle-category-icon";

const STEPS = ["Assicurazione", "Servizi Extra", "Documenti e Fatturazione", "Pagamento"] as const;

export function RentCheckoutWizard({
  vehicleCategory,
  vehicleName,
  startDate,
  endDate,
  days,
  basePrice,
}: {
  vehicleCategory: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  days: number;
  basePrice: number;
}) {
  const router = useRouter();
  const { extras } = useExtraServices();

  const [step, setStep] = useState(0);
  const [insurance, setInsurance] = useState<InsuranceOptionDto | null>(null);
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

  const insurancePreview = insurance ? Number(insurance.dailyCost) * days : 0;
  const extrasPreview = useMemo(() => computeExtrasTotalPreview(extras, extraSelection, days), [extras, extraSelection, days]);
  const totalPreview = basePrice + insurancePreview + extrasPreview;

  async function handleConfirm() {
    if (!insurance) {
      setError("Seleziona un'opzione assicurativa per proseguire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "rent",
          vehicleCategory,
          startDate,
          endDate,
          insuranceOptionId: insurance.id,
          paymentMethod,
          extras: extraSelection,
          customer: { ...invoice, ...documents },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore nella creazione della prenotazione");
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
            Il pagamento verra&apos; effettuato al ritiro del veicolo. Ti stiamo reindirizzando alla tua prenotazione...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {STEPS.map((label, i) => (
                <span
                  key={label}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}. {label}
                </span>
              ))}
            </div>
            <CardTitle className="pt-2">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 && (
              <InsuranceSelector
                days={days}
                selectedId={insurance?.id ?? null}
                paymentMethod={paymentMethod}
                onSelect={setInsurance}
              />
            )}

            {step === 1 && <ExtrasSelector extras={extras} selected={extraSelection} onChange={setExtraSelection} />}

            {step === 2 && (
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

            {step === 3 && (
              <div className="space-y-4">
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <label className="flex items-center gap-3 rounded-md border p-3">
                    <RadioGroupItem value="credit_card" />
                    <Label className="font-normal">Carta di Credito</Label>
                  </label>
                  <label className="flex items-center gap-3 rounded-md border p-3">
                    <RadioGroupItem value="debit_card" />
                    <Label className="font-normal">Carta di Debito</Label>
                  </label>
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  {insurance && isKasko(insurance.tier)
                    ? "Nessuna cauzione richiesta (KASKO Senza Cauzione) - pagherai al ritiro del veicolo."
                    : "La cauzione e il noleggio verranno saldati al ritiro del veicolo, presso la nostra sede."}
                </p>
              </div>
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
                    if (step === 0 && !insurance) {
                      setError("Seleziona un'opzione assicurativa per proseguire.");
                      return;
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
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="text-base">Riepilogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <VehicleCategoryIcon
              category={vehicleCategory}
              className="mb-2 h-24 w-full"
              iconClassName="size-10"
            />
            <p className="font-medium">{vehicleName} o simile</p>
            <p className="text-muted-foreground">{vehicleCategory}</p>
            <Separator className="my-2" />
            <p>Ritiro: {formatItalianDate(new Date(startDate))}</p>
            <p>Riconsegna: {formatItalianDate(new Date(endDate))}</p>
            <p>{days} giorni</p>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span>Noleggio</span>
              <span>EUR {basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Assicurazione</span>
              <span>EUR {insurancePreview.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Extra</span>
              <span>EUR {extrasPreview.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-semibold">
              <span>Totale stimato</span>
              <span>EUR {totalPreview.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
