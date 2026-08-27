import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/session";
import { ExpenseForm } from "@/components/desk/expense-form";
import { ExpenseDeleteButton } from "@/components/desk/expense-delete-button";
import { startOfWeek, weekDays, addDays, ITALIAN_WEEKDAY_LABELS } from "@/lib/week";
import type { PaymentMethod } from "@/generated/prisma/client";

const METHOD_COLOR: Record<PaymentMethod, string> = {
  contanti: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  pos: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  stripe: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  sumup: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  bonifico: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  altro: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  contanti: "Contanti",
  pos: "POS",
  stripe: "Stripe",
  sumup: "SumUp",
  bonifico: "Bonifico",
  altro: "Altro",
};

export default async function CashRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { tenantId } = await requireTenant();
  const { week } = await searchParams;

  const weekStart = startOfWeek(week ? new Date(week) : new Date());
  const weekEnd = addDays(weekStart, 7);
  const days = weekDays(weekStart);

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId, status: "captured", capturedAt: { gte: weekStart, lt: weekEnd } },
      include: { booking: { include: { user: true, operator: true } } },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.expense.findMany({ where: { tenantId, date: { gte: weekStart, lt: weekEnd } }, orderBy: { date: "asc" } }),
  ]);

  const weekIncassi = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const weekSpese = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const prevWeek = addDays(weekStart, -7).toISOString().slice(0, 10);
  const nextWeek = addDays(weekStart, 7).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Cassa Settimanale</h1>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/desk/cassa?week=${prevWeek}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            {weekStart.toLocaleDateString("it-IT")} - {addDays(weekStart, 6).toLocaleDateString("it-IT")}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/desk/cassa?week=${nextWeek}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Incassi settimana</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-500">EUR {weekIncassi.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Spese settimana</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-500">EUR {weekSpese.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Cassa netta</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">EUR {(weekIncassi - weekSpese).toFixed(2)}</CardContent>
        </Card>
      </div>

      <ExpenseForm />

      <div className="grid gap-4 lg:grid-cols-2">
        {days.map((day, idx) => {
          const dayEnd = addDays(day, 1);
          const dayPayments = payments.filter((p) => p.capturedAt && p.capturedAt >= day && p.capturedAt < dayEnd);
          const dayExpenses = expenses.filter((e) => e.date >= day && e.date < dayEnd);
          const incassi = dayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
          const spese = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

          return (
            <Card key={day.toISOString()}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>
                    {ITALIAN_WEEKDAY_LABELS[idx]} {day.toLocaleDateString("it-IT")}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">Netto: EUR {(incassi - spese).toFixed(2)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={METHOD_COLOR[p.method]}>
                        {METHOD_LABEL[p.method]}
                      </Badge>
                      {p.booking.user.fullName} - {p.booking.operator?.fullName ?? "-"}
                    </span>
                    <span>EUR {Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
                {dayExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm text-red-500">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="border-red-500/30 bg-red-500/15 text-red-500">
                        Spesa: {e.category}
                      </Badge>
                      {e.description}
                    </span>
                    <span className="flex items-center gap-1">
                      -EUR {Number(e.amount).toFixed(2)}
                      <ExpenseDeleteButton id={e.id} />
                    </span>
                  </div>
                ))}
                {dayPayments.length === 0 && dayExpenses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessuna transazione.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
