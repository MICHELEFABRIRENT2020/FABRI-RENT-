import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatItalianDate } from "@/lib/rental-time";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confermata",
  checked_in: "Check-in effettuato",
  completed: "Completata",
  canceled: "Annullata",
};

function dayRange(dateStr: string) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default async function DeskDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date ?? new Date().toISOString().slice(0, 10);
  const { start, end } = dayRange(selectedDate);

  const [arrivals, departures] = await Promise.all([
    prisma.booking.findMany({
      where: { startDate: { gte: start, lt: end }, status: { not: "canceled" } },
      include: { user: true, vehicle: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.booking.findMany({
      where: { endDate: { gte: start, lt: end }, status: { not: "canceled" } },
      include: { user: true, vehicle: true },
      orderBy: { endDate: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feed Arrivi / Partenze</h1>
        <form className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" variant="outline">
            Filtra
          </Button>
        </form>
      </div>

      <BookingTable title="Ritiri / Ingressi previsti" bookings={arrivals} timeField="startDate" />
      <BookingTable title="Riconsegne / Uscite previste" bookings={departures} timeField="endDate" />
    </div>
  );
}

type BookingRow = Prisma.BookingGetPayload<{ include: { user: true; vehicle: true } }>;

function BookingTable({
  title,
  bookings,
  timeField,
}: {
  title: string;
  bookings: BookingRow[];
  timeField: "startDate" | "endDate";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orario</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Servizio</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{formatItalianDate(b[timeField])}</TableCell>
                <TableCell>{b.user.fullName}</TableCell>
                <TableCell>
                  {b.serviceType === "rent" ? `${b.vehicle?.name ?? "Auto"} o simile` : "Parcheggio Parking Go"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[b.status] ?? b.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/desk/prenotazioni/${b.id}`}>Apri</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nessuna prenotazione.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
