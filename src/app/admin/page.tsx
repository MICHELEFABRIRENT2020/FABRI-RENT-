import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function dayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default async function AdminDashboardPage() {
  const { start, end } = dayRange();

  const [totalBookings, revenueAgg, arrivalsToday, departuresToday, capacities, occupiedCoperto, occupiedScoperto, vehiclesInMaintenance] =
    await Promise.all([
      prisma.booking.count({ where: { status: { not: "canceled" } } }),
      prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { paymentStatus: "paid" } }),
      prisma.booking.count({ where: { startDate: { gte: start, lt: end }, status: { not: "canceled" } } }),
      prisma.booking.count({ where: { endDate: { gte: start, lt: end }, status: { not: "canceled" } } }),
      prisma.parkingCapacity.findMany(),
      prisma.booking.count({
        where: { serviceType: "parking", parkingType: "coperto", status: { in: ["confirmed", "checked_in"] } },
      }),
      prisma.booking.count({
        where: { serviceType: "parking", parkingType: "scoperto", status: { in: ["confirmed", "checked_in"] } },
      }),
      prisma.vehicle.count({ where: { status: "maintenance" } }),
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
    { label: "Veicoli in manutenzione", value: vehiclesInMaintenance },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Direzionale</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}
