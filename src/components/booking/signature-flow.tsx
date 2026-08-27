"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { requestSignatureOtp, confirmSignature } from "@/lib/actions/signature-actions";

export function SignatureFlow({ token, alreadySigned }: { token: string; alreadySigned: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [otpSent, setOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");
  const [signed, setSigned] = useState(alreadySigned);
  const [error, setError] = useState<string | null>(null);

  if (signed) {
    return (
      <Alert>
        <CheckCircle2 className="size-4" />
        <AlertTitle>Contratto firmato</AlertTitle>
        <AlertDescription>Grazie, la firma e&apos; stata registrata correttamente.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!otpSent ? (
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const res = await requestSignatureOtp(token);
                setMaskedPhone(res.maskedPhone);
                setOtpSent(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Errore");
              }
            })
          }
        >
          Invia codice OTP per firmare
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Codice inviato a {maskedPhone}</p>
          <div className="space-y-2">
            <Label htmlFor="otp">Codice OTP</Label>
            <Input id="otp" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
          </div>
          <Button
            disabled={isPending || code.length < 4}
            onClick={() =>
              startTransition(async () => {
                try {
                  await confirmSignature(token, code);
                  setSigned(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Errore");
                }
              })
            }
          >
            Conferma firma
          </Button>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
