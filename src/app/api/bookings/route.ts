import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation/booking";
import { createBooking, BookingConflictError } from "@/lib/booking-service";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = createBookingSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { booking, clientSecret } = await createBooking(parsed.data);
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
