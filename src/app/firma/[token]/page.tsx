import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignatureFlow } from "@/components/booking/signature-flow";
import { formatItalianDate } from "@/lib/rental-time";

export default async function SignContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({
    where: { signatureLinkToken: token },
    include: { user: true, vehicle: true, tenant: true },
  });

  if (!booking) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Firma il contratto - {booking.tenant.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Contratto n. </span>
              {booking.contractNumber ?? booking.id}
            </p>
            <p>
              <span className="text-muted-foreground">Cliente: </span>
              {booking.user.fullName}
            </p>
            <p>
              <span className="text-muted-foreground">Veicolo: </span>
              {booking.vehicle?.name} o simile
            </p>
            <p>
              <span className="text-muted-foreground">Periodo: </span>
              {formatItalianDate(booking.startDate)} - {formatItalianDate(booking.endDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Totale: </span>
              EUR {Number(booking.priceOverride ?? booking.totalPrice).toFixed(2)}
            </p>
          </div>
          <Separator />
          <SignatureFlow token={token} alreadySigned={booking.signatureStatus === "signed"} />
        </CardContent>
      </Card>
    </div>
  );
}
