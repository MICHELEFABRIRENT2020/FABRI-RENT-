import { requireRole, WRITE_ROLES } from "@/lib/session";
import { WalkInContractWizard } from "@/components/desk/walk-in-contract-wizard";

export default async function NewWalkInContractPage() {
  await requireRole(...WRITE_ROLES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuovo contratto (walk-in)</h1>
        <p className="text-sm text-muted-foreground">
          Crea un contratto di noleggio direttamente da banco, per un cliente che si presenta in sede senza aver
          prenotato online.
        </p>
      </div>
      <WalkInContractWizard />
    </div>
  );
}
