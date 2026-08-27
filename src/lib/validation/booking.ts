import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2, "Nome completo obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(6, "Numero di telefono non valido"),
  idCardNumber: z.string().min(3).optional(),
  driverLicenseNumber: z.string().min(3).optional(),
  idCardFrontUrl: z.string().url().optional(),
  idCardBackUrl: z.string().url().optional(),
  licenseFrontUrl: z.string().url().optional(),
  licenseBackUrl: z.string().url().optional(),
  // Fatturazione elettronica
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  sdiCode: z.string().max(7).optional(),
  pec: z.string().email().optional().or(z.literal("")),
});

export const extraLineSchema = z.object({
  extraServiceId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

const dateRangeRefine = <T extends { startDate: string; endDate: string }>(data: T, ctx: z.RefinementCtx) => {
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    ctx.addIssue({
      code: "custom",
      message: "La data di riconsegna deve essere successiva al ritiro",
      path: ["endDate"],
    });
  }
};

export const createRentBookingSchema = z
  .object({
    serviceType: z.literal("rent"),
    vehicleCategory: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    insuranceOptionId: z.string().uuid(),
    paymentMethod: z.enum(["credit_card", "debit_card"]),
    extras: z.array(extraLineSchema).default([]),
    customer: customerSchema,
  })
  .superRefine(dateRangeRefine);

export const createParkingBookingSchema = z
  .object({
    serviceType: z.literal("parking"),
    parkingCategory: z.enum(["moto", "auto", "furgone"]),
    parkingType: z.enum(["coperto", "scoperto"]),
    keysLeft: z.boolean().default(false),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    paymentMethod: z.enum(["credit_card", "debit_card"]),
    extras: z.array(extraLineSchema).default([]),
    customer: customerSchema,
  })
  .superRefine(dateRangeRefine);

export const createBookingSchema = z.discriminatedUnion("serviceType", [
  createRentBookingSchema,
  createParkingBookingSchema,
]);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
