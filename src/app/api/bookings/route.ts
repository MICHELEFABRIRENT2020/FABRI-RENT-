import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation/booking";
import { createBooking, BookingConflictError } from "@/lib/booking-service";
import { getPublicTenant } from "@/lib/tenant";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = await rateLimit("booking-create", ip, RATE_LIMITS.bookingCreate);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra qualche minuto." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = createBookingSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const tenant = await getPublicTenant();
    const { booking, clientSecret } = await createBooking(tenant.id, parsed.data);
    return NextResponse.json(
      {
        bookingId: booking.id,
        totalPrice: booking.totalPrice,
        depositAmount: booking.depositAmount,
        clientSecret,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[bookings:POST]", error);
    return NextResponse.json({ error: "Errore durante la creazione della prenotazione" }, { status: 500 });
  }
}
