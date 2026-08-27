import { prisma } from "@/lib/prisma";
import { ExtensionRequestForm } from "@/components/desk/extension-request-form";
import { ExtensionRequestList } from "@/components/desk/extension-request-list";
import { requireTenant } from "@/lib/session";

export default async function ExtensionsPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { tenantId } = await requireTenant();
  const { bookingId } = await searchParams;
  const requests = await prisma.extensionRequest.findMany({
    where: { tenantId, status: "pending" },
    include: { booking: { include: { user: true, vehicle: true } } },
    orderBy: { createdAt: "desc" },
  });

  const dto = requests.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    channel: r.channel,
    requestedEndDate: r.requestedEndDate.toISOString(),
    status: r.status,
    booking: { user: { fullName: r.booking.user.fullName }, vehicle: r.booking.vehicle ? { name: r.booking.vehicle.name } : null },
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Smart Extension Engine</h1>
      <ExtensionRequestForm defaultBookingId={bookingId} />
      <ExtensionRequestList requests={dto} />
    </div>
  );
}
