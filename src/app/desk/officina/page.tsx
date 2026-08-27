import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireTenant } from "@/lib/session";
import { WorkshopInterventionForm } from "@/components/desk/workshop-intervention-form";
import { formatItalianDate } from "@/lib/rental-time";

export default async function WorkshopPage() {
  const { tenantId } = await requireTenant();

  const [catalog, vehicles, interventions, tenant] = await Promise.all([
    prisma.workshopCatalogItem.findMany({ where: { tenantId, active: true }, orderBy: { label: "asc" } }),
    prisma.vehicle.findMany({ where: { tenantId, status: { not: "fuori_flotta" } }, orderBy: { name: "asc" } }),
    prisma.workshopIntervention.findMany({
      where: { tenantId },
      include: { vehicle: true, operator: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
  ]);

  const dueForMaintenance = vehicles.filter((v) => {
    const last = v.lastMaintenanceKm ?? 0;
    const current = v.odometerKm ?? 0;
    return current - last >= tenant.maintenanceIntervalKm;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Officina</h1>

      {dueForMaintenance.length > 0 && (
        <Alert>
          <AlertTitle>Manutenzione in scadenza (ogni {tenant.maintenanceIntervalKm.toLocaleString("it-IT")} km)</AlertTitle>
          <AlertDescription>{dueForMaintenance.map((v) => v.name).join(", ")}</AlertDescription>
        </Alert>
      )}

      <WorkshopInterventionForm
        catalog={catalog.map((c) => ({ id: c.id, category: c.category, label: c.label }))}
        vehicles={vehicles.map((v) => ({ id: v.id, name: v.name, plate: v.plate }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storico interventi</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Veicolo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Intervento</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Fornitore</TableHead>
                <TableHead>Km</TableHead>
                <TableHead>Operatore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interventions.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="whitespace-nowrap">{formatItalianDate(i.date)}</TableCell>
                  <TableCell className="whitespace-nowrap">{i.vehicle.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.category}</Badge>
                  </TableCell>
                  <TableCell>{i.label}</TableCell>
                  <TableCell>{i.price ? `EUR ${Number(i.price).toFixed(2)}` : "-"}</TableCell>
                  <TableCell>{i.supplier ?? "-"}</TableCell>
                  <TableCell>{i.km ?? "-"}</TableCell>
                  <TableCell>{i.operator?.fullName ?? "-"}</TableCell>
                </TableRow>
              ))}
              {interventions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nessun intervento registrato.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
