"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { SignaturePad } from "@/components/desk/signature-pad";
import { PhotoUploader } from "@/components/desk/photo-uploader";
import { checkInBooking, requestCheckInOtp } from "@/lib/actions/desk-actions";
import type { CheckInMethod } from "@/generated/prisma/client";

export function CheckInPanel({ bookingId, customerPhone }: { bookingId: string; customerPhone: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("");
  const [method, setMethod] = useState<CheckInMethod>("digital_signature");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [damageNotes, setDamageNotes] = useState("");

  async function uploadSignature(dataUrl: string) {
    const blob = await (await fetch(dataUrl)).blob();
    const formData = new FormData();
    formData.append("file", new File([blob], "firma.png", { type: "image/png" }));
    formData.append("folder", "documents");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      setSignatureUrl(url);
      toast.success("Firma acquisita");
    }
  }

  function handleSubmit() {
    if (!km || !fuel) {
      toast.error("Inserisci KM e livello carburante.");
      return;
    }
    startTransition(async () => {
      try {
        await checkInBooking({
          bookingId,
          km: Number(km),
          fuel,
          method,
          signatureUrl: signatureUrl ?? undefined,
          otpPhone: method === "otp_sms" ? customerPhone : undefined,
          otpCode: method === "otp_sms" ? otpCode : undefined,
          damagePhotoUrls: damagePhotos,
          damageNotes: damageNotes || undefined,
        });
        toast.success("Check-in completato");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore durante il check-in");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Check-in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="km">Chilometraggio</Label>
            <Input id="km" type="number" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel">Livello carburante</Label>
            <Input id="fuel" placeholder="es. Pieno, 3/4, 1/2" value={fuel} onChange={(e) => setFuel(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Metodo di conferma</Label>
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as CheckInMethod)} className="gap-2">
            <label className="flex items-center gap-2">
              <RadioGroupItem value="digital_signature" /> Firma digitale su tablet
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="otp_sms" /> Verifica codice OTP SMS
            </label>
          </RadioGroup>
        </div>

        {method === "digital_signature" ? (
          <SignaturePad onSave={uploadSignature} />
        ) : (
          <div className="flex items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="otp">Codice OTP</Label>
              <Input id="otp" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await requestCheckInOtp(customerPhone);
                setOtpSent(true);
                toast.success(`SMS inviato a ${customerPhone}`);
              }}
            >
              {otpSent ? "Rinvia codice" : "Invia codice"}
            </Button>
          </div>
        )}

        {signatureUrl && <p className="text-xs text-green-600">Firma salvata.</p>}

        <div className="space-y-2">
          <Label>Stato Danni Fotografico (danni preesistenti)</Label>
          <PhotoUploader urls={damagePhotos} onChange={setDamagePhotos} />
          <Textarea
            placeholder="Note su graffi/danni preesistenti (opzionale)"
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
          />
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Conferma Check-in"}
        </Button>
      </CardContent>
    </Card>
  );
}
