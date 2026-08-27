import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/session";
import { ClaimForm } from "@/components/desk/claim-form";
import { ClaimList } from "@/components/desk/claim-list";

export default async function ClaimsPage() {
  const { tenantId } = await requireTenant();
  const claims = await prisma.claim.findMany({
    where: { tenantId },
    include: { vehicle: true, booking: { include: { user: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });

  const dto = claims.map((c) => ({
    id: c.id,
    date: c.date.toISOString(),
    location: c.location,
    vehicleName: c.vehicle?.name ?? null,
    customerName: c.booking?.user.fullName ?? null,
    costs: c.costs?.toString() ?? null,
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sinistri</h1>
      <ClaimForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro sinistri ({claims.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ClaimList claims={dto} />
        </CardContent>
      </Card>
    </div>
  );
}
