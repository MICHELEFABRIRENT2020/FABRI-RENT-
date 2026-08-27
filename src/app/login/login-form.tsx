"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ERROR_MESSAGES: Record<string, string> = {
  credentials_invalid: "Credenziali non valide. Riprova.",
  account_locked: "Account temporaneamente bloccato per troppi tentativi falliti. Riprova tra qualche minuto.",
  rate_limited: "Troppi tentativi. Riprova tra qualche minuto.",
  totp_invalid: "Codice 2FA non valido. Riprova.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const formEmail = needsTwoFactor ? email : (formData.get("email") as string);
    const formPassword = needsTwoFactor ? password : (formData.get("password") as string);

    startTransition(async () => {
      const res = await signIn("credentials", {
        email: formEmail,
        password: formPassword,
        ...(needsTwoFactor ? (useBackupCode ? { backupCode: code } : { totp: code }) : {}),
        redirect: false,
      });

      if (res?.code === "totp_required") {
        setEmail(formEmail);
        setPassword(formPassword);
        setNeedsTwoFactor(true);
        return;
      }

      if (res?.error) {
        setError(ERROR_MESSAGES[res.code ?? ""] ?? "Credenziali non valide. Riprova.");
        if (needsTwoFactor) setCode("");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    });
  }

  if (needsTwoFactor) {
    return (
      <form action={onSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          Inserisci il codice della tua app authenticator{useBackupCode ? " o un codice di backup" : ""}.
        </p>
        <div className="space-y-2">
          <Label htmlFor="code">{useBackupCode ? "Codice di backup" : "Codice a 6 cifre"}</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            inputMode={useBackupCode ? "text" : "numeric"}
            maxLength={useBackupCode ? 11 : 6}
            className="font-mono"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending || !code}>
          {isPending ? "Verifica in corso..." : "Verifica"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline"
          onClick={() => {
            setUseBackupCode((v) => !v);
            setCode("");
          }}
        >
          {useBackupCode ? "Usa il codice dell'app authenticator" : "Usa un codice di backup"}
        </button>
      </form>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Accesso in corso..." : "Accedi"}
      </Button>
    </form>
  );
}
