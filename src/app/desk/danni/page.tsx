import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/session";
import { DamageRecordForm } from "@/components/desk/damage-record-form";
import { DamageRecordList } from "@/components/desk/damage-record-list";

export default async function DamagesPage() {
  const { tenantId } = await requireTenant();
  const records = await prisma.damageRecord.findMany({
    where: { tenantId },
    include: { vehicle: true, booking: { include: { user: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });

  const dto = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    type: r.type,
    position: r.position,
    vehicleName: r.vehicle?.name ?? null,
    customerName: r.booking?.user.fullName ?? null,
    costEstimated: r.costEstimated?.toString() ?? null,
    status: r.status,
    photoCount: r.photoUrls.length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Danni</h1>
      <DamageRecordForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro danni ({records.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <DamageRecordList records={dto} />
        </CardContent>
      </Card>
    </div>
  );
}
