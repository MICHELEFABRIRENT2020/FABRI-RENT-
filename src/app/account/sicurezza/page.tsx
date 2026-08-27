import { getTwoFactorStatus } from "@/lib/actions/two-factor-actions";
import { TwoFactorPanel } from "@/components/account/two-factor-panel";

export default async function SecuritySettingsPage() {
  const status = await getTwoFactorStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sicurezza account</h1>
        <p className="text-sm text-muted-foreground">
          Gestisci l&apos;autenticazione a due fattori (2FA) per il tuo accesso.
        </p>
      </div>
      <TwoFactorPanel initialEnabled={status.enabled} initialRemainingBackupCodes={status.remainingBackupCodes} />
    </div>
  );
}
