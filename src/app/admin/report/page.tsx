import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

export default async function AdminReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const where = {
    createdAt: {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    },
  };

  const [count, revenue, byService] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { ...where, paymentStatus: "paid" } }),
    prisma.booking.groupBy({ by: ["serviceType"], _count: { _all: true }, where }),
  ]);

  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Report Finanziari</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtra per periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">Da</Label>
              <Input id="from" type="date" name="from" defaultValue={from} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">A</Label>
              <Input id="to" type="date" name="to" defaultValue={to} />
            </div>
            <Button type="submit" variant="outline">
              Applica
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Prenotazioni nel periodo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{count}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Incasso confermato</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">EUR {Number(revenue._sum.totalPrice ?? 0).toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Per servizio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {byService.map((s) => (
              <p key={s.serviceType}>
                {s.serviceType === "rent" ? "Noleggio" : "Parcheggio"}: {s._count._all}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Esporta log prenotazioni</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <a href={`/api/admin/export/csv?${query.toString()}`}>
              <Download className="mr-2 size-4" /> Esporta CSV
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/admin/export/excel?${query.toString()}`}>
              <Download className="mr-2 size-4" /> Esporta Excel
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
