"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  beginTwoFactorEnrollment,
  confirmTwoFactorEnrollment,
  disableTwoFactor,
} from "@/lib/actions/two-factor-actions";

type Step = "idle" | "enrolling" | "confirming" | "backup-codes";

export function TwoFactorPanel({
  initialEnabled,
  initialRemainingBackupCodes,
}: {
  initialEnabled: boolean;
  initialRemainingBackupCodes: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [remainingBackupCodes, setRemainingBackupCodes] = useState(initialRemainingBackupCodes);
  const [step, setStep] = useState<Step>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleEnroll() {
    startTransition(async () => {
      try {
        const result = await beginTwoFactorEnrollment();
        setQrDataUrl(result.qrDataUrl);
        setSecret(result.secret);
        setStep("confirming");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore durante l'attivazione 2FA.");
      }
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await confirmTwoFactorEnrollment(token);
        setBackupCodes(result.backupCodes);
        setStep("backup-codes");
        setEnabled(true);
        setRemainingBackupCodes(result.backupCodes.length);
        toast.success("2FA attivata.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Codice non valido.");
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      try {
        await disableTwoFactor(disablePassword);
        setEnabled(false);
        setStep("idle");
        setDisablePassword("");
        toast.success("2FA disattivata.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Autenticazione a due fattori (2FA)
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Attiva" : "Non attiva"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && !enabled && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Protegge l&apos;accesso con un codice a 6 cifre generato da un&apos;app authenticator
              (Google Authenticator, Microsoft Authenticator, Authy...) oltre alla password.
            </p>
            <Button onClick={handleEnroll} disabled={isPending}>
              Attiva 2FA
            </Button>
          </div>
        )}

        {step === "confirming" && qrDataUrl && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scansiona il QR code con la tua app authenticator, poi inserisci il codice a 6 cifre generato.
            </p>
            <Image src={qrDataUrl} alt="QR code 2FA" width={200} height={200} className="rounded-md border border-border" unoptimized />
            {secret && (
              <p className="font-mono text-xs text-muted-foreground">
                Chiave manuale: <span className="select-all">{secret}</span>
              </p>
            )}
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <Label htmlFor="totp-confirm">Codice a 6 cifre</Label>
                <Input
                  id="totp-confirm"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  className="w-32 font-mono"
                />
              </div>
              <Button onClick={handleConfirm} disabled={isPending || token.length !== 6}>
                Conferma
              </Button>
            </div>
          </div>
        )}

        {step === "backup-codes" && backupCodes.length > 0 && (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                Conserva questi codici di backup in un posto sicuro: ognuno puo&apos; essere usato una
                sola volta per accedere se perdi l&apos;accesso all&apos;app authenticator. Non verranno
                mostrati di nuovo.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-4 font-mono text-sm">
              {backupCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <Button variant="outline" onClick={() => setStep("idle")}>
              Ho salvato i codici
            </Button>
          </div>
        )}

        {enabled && step === "idle" && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Codici di backup residui: <span className="font-semibold text-foreground">{remainingBackupCodes}</span>
            </p>
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <Label htmlFor="disable-password">Password (per disattivare)</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-56"
                />
              </div>
              <Button variant="destructive" onClick={handleDisable} disabled={isPending || !disablePassword}>
                Disattiva 2FA
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
