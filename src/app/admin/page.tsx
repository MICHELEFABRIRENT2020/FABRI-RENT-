import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireTenant } from "@/lib/session";
import { formatItalianDate } from "@/lib/rental-time";
import type { VehicleStatus } from "@/generated/prisma/client";

function dayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const FLEET_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Disponibili",
  rented: "Noleggiati",
  maintenance: "Manutenzione",
  guasto: "Guasti",
  fuori_flotta: "Fuori flotta",
  non_disponibile: "Non disponibili",
};

export default async function AdminDashboardPage() {
  const { tenantId } = await requireTenant();
  const { start, end } = dayRange();

  const [
    totalBookings,
    revenueAgg,
    arrivalsToday,
    departuresToday,
    capacities,
    occupiedCoperto,
    occupiedScoperto,
    fleetByStatus,
    liveBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { tenantId, status: { not: "canceled" } } }),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { tenantId, paymentStatus: "paid" } }),
    prisma.booking.count({ where: { tenantId, startDate: { gte: start, lt: end }, status: { not: "canceled" } } }),
    prisma.booking.count({ where: { tenantId, endDate: { gte: start, lt: end }, status: { not: "canceled" } } }),
    prisma.parkingCapacity.findMany({ where: { tenantId } }),
    prisma.booking.count({
      where: { tenantId, serviceType: "parking", parkingType: "coperto", status: { in: ["confirmed", "checked_in"] } },
    }),
    prisma.booking.count({
      where: { tenantId, serviceType: "parking", parkingType: "scoperto", status: { in: ["confirmed", "checked_in"] } },
    }),
    prisma.vehicle.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.booking.findMany({
      where: { tenantId, serviceType: "rent", status: { in: ["confirmed", "checked_in"] } },
      include: { vehicle: true, user: true },
      orderBy: { startDate: "asc" },
      take: 20,
    }),
  ]);

  const copertoCap = capacities.find((c) => c.slotType === "coperto")?.maxSlots ?? 0;
  const scopertoCap = capacities.find((c) => c.slotType === "scoperto")?.maxSlots ?? 0;

  const stats = [
    { label: "Prenotazioni totali", value: totalBookings },
    { label: "Incasso confermato", value: `EUR ${Number(revenueAgg._sum.totalPrice ?? 0).toFixed(2)}` },
    { label: "Ritiri/ingressi oggi", value: arrivalsToday },
    { label: "Riconsegne/uscite oggi", value: departuresToday },
    { label: "Occupazione coperto", value: `${occupiedCoperto}/${copertoCap}` },
    { label: "Occupazione scoperto", value: `${occupiedScoperto}/${scopertoCap}` },
  ];

  const totalFleet = fleetByStatus.reduce((sum, g) => sum + g._count._all, 0);
  const fleetStats = [
    { label: "Totale veicoli", value: totalFleet },
    ...(Object.keys(FLEET_STATUS_LABEL) as VehicleStatus[]).map((status) => ({
      label: FLEET_STATUS_LABEL[status],
      value: fleetByStatus.find((g) => g.status === status)?._count._all ?? 0,
    })),
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard Direzionale</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{s.value}</CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Dashboard Flotta Live</h2>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {fleetStats.map((s) => (
            <Card key={s.label}>
              <CardHeader>
                <CardTitle className="text-xs font-normal text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">{s.value}</CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro live</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Targa</TableHead>
                  <TableHead>Modello</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Uscita</TableHead>
                  <TableHead>Rientro</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.vehicle?.plate ?? "-"}</TableCell>
                    <TableCell>{b.vehicle?.name ?? "-"}</TableCell>
                    <TableCell>{b.user.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatItalianDate(b.startDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatItalianDate(b.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "checked_in" ? "default" : "secondary"}>
                        {b.status === "checked_in" ? "In corso" : "Confermato"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {liveBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nessun noleggio attivo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
