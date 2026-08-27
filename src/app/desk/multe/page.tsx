import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/lib/session";
import { FineForm } from "@/components/desk/fine-form";
import { FineList } from "@/components/desk/fine-list";

export default async function FinesPage() {
  const { tenantId } = await requireTenant();
  const fines = await prisma.fine.findMany({
    where: { tenantId },
    include: { issuingAuthority: true },
    orderBy: { violationDate: "desc" },
    take: 100,
  });

  const dto = fines.map((f) => ({
    id: f.id,
    plate: f.plate,
    violationDate: f.violationDate.toISOString(),
    verbaleNumber: f.verbaleNumber,
    authorityName: f.issuingAuthority?.name ?? null,
    amount: f.amount.toString(),
    dueDate: f.dueDate?.toISOString() ?? null,
    hasContract: Boolean(f.contractId),
    status: f.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Multe</h1>
        <Button asChild size="sm" variant="outline">
          <Link href="/desk/multe/enti">Rubrica Enti / PEC</Link>
        </Button>
      </div>
      <FineForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro multe ({fines.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <FineList fines={dto} />
        </CardContent>
      </Card>
    </div>
  );
}
