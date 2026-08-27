"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ExtrasSelector, type ExtraSelection } from "@/components/booking/extras-selector";
import { DocumentUploader, type DocumentSlotKey } from "@/components/booking/document-uploader";
import { InvoiceForm, type InvoiceFormValues } from "@/components/booking/invoice-form";
import { useExtraServices, computeExtrasTotalPreview } from "@/lib/hooks/use-extra-services";
import { formatItalianDate } from "@/lib/rental-time";
import type { ParkingCategory, ParkingSlotType } from "@/generated/prisma/client";

const STEPS = ["Servizi Extra", "Documenti e Fatturazione", "Pagamento"] as const;

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
            Il pagamento verra&apos; effettuato all&apos;ingresso. Ti stiamo reindirizzando alla tua prenotazione...
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
            {step === 0 && <ExtrasSelector extras={extras} selected={extraSelection} onChange={setExtraSelection} />}

            {step === 1 && (
              <div className="space-y-6">
                <InvoiceForm values={invoice} onChange={setInvoice} />
                <Separator />
                <div>
                  <h4 className="mb-3 text-sm font-semibold">Documenti di identita&apos; (4 file)</h4>
                  <DocumentUploader
                    values={documents}
                    onChange={(key, url) => setDocuments((d) => ({ ...d, [key]: url }))}
                    onExtracted={(fields) =>
                      setInvoice((prev) => ({
                        ...prev,
                        fullName: prev.fullName || [fields.firstName, fields.lastName].filter(Boolean).join(" "),
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {step === 2 && (
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
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                Indietro
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>Avanti</Button>
              ) : (
                <Button onClick={handleConfirm} disabled={submitting}>
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
            <p className="font-medium">
              Parcheggio {CATEGORY_LABEL[category]} - {SLOT_LABEL[slotType]}
            </p>
            <p className="text-muted-foreground">{keysLeft ? "Consegna chiavi in sede" : ""}</p>
            <Separator className="my-2" />
            <p>Ingresso: {formatItalianDate(new Date(startDate))}</p>
            <p>Uscita: {formatItalianDate(new Date(endDate))}</p>
            <p>{days} giorni</p>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span>Parcheggio</span>
              <span>EUR {basePrice.toFixed(2)}</span>
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
