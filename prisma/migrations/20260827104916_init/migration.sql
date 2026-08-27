-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('client', 'operator', 'super_admin');

-- CreateEnum
CREATE TYPE "booking_service" AS ENUM ('rent', 'parking');

-- CreateEnum
CREATE TYPE "parking_slot_type" AS ENUM ('coperto', 'scoperto');

-- CreateEnum
CREATE TYPE "parking_category" AS ENUM ('moto', 'auto', 'furgone');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('available', 'rented', 'maintenance', 'retired');

-- CreateEnum
CREATE TYPE "pricing_scope" AS ENUM ('rent', 'parking');

-- CreateEnum
CREATE TYPE "pricing_rule_type" AS ENUM ('date_range', 'weekday', 'weekend', 'holiday');

-- CreateEnum
CREATE TYPE "insurance_zone" AS ENUM ('sud_italia', 'centro_nord_italia');

-- CreateEnum
CREATE TYPE "insurance_tier" AS ENUM ('base', 'medium', 'full', 'kasko_senza_cauzione');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('id_card_front', 'id_card_back', 'license_front', 'license_back');

-- CreateEnum
CREATE TYPE "document_audit_status" AS ENUM ('pending', 'approved', 'reupload_requested');

-- CreateEnum
CREATE TYPE "check_in_method" AS ENUM ('digital_signature', 'otp_sms');

-- CreateEnum
CREATE TYPE "extension_channel" AS ENUM ('whatsapp', 'web');

-- CreateEnum
CREATE TYPE "extension_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "damage_ticket_status" AS ENUM ('open', 'deposit_withheld', 'resolved');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('deposit_authorization', 'kasko_charge', 'extra_charge', 'refund');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'canceled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "phone" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'client',
    "id_card_number" TEXT,
    "driver_license_number" TEXT,
    "id_card_front_url" TEXT,
    "id_card_back_url" TEXT,
    "license_front_url" TEXT,
    "license_back_url" TEXT,
    "company_name" TEXT,
    "vat_number" TEXT,
    "sdi_code" TEXT,
    "pec" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_or_similar" BOOLEAN NOT NULL DEFAULT true,
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "status" "vehicle_status" NOT NULL DEFAULT 'available',
    "seats" INTEGER,
    "transmission" TEXT,
    "fuel_type" TEXT,
    "image_url" TEXT,
    "plate" TEXT,
    "maintenance_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "pricing_scope" NOT NULL,
    "type" "pricing_rule_type" NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "category" TEXT,
    "multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "fixed_rate" DECIMAL(10,2),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_base_rates" (
    "id" TEXT NOT NULL,
    "category" "parking_category" NOT NULL,
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "coperto_uplift" DECIMAL(5,2) NOT NULL DEFAULT 0.40,

    CONSTRAINT "parking_base_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_capacity" (
    "id" TEXT NOT NULL,
    "slotType" "parking_slot_type" NOT NULL,
    "max_slots" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_options" (
    "id" TEXT NOT NULL,
    "zone" "insurance_zone" NOT NULL,
    "tier" "insurance_tier" NOT NULL,
    "label" TEXT NOT NULL,
    "residual_deductible" DECIMAL(10,2) NOT NULL,
    "daily_cost" DECIMAL(10,2) NOT NULL,
    "requires_credit_card" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "insurance_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "per_day" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "extra_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_extra_services" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "extra_service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_extra_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type" "booking_service" NOT NULL,
    "vehicle_id" TEXT,
    "parking_type" "parking_slot_type",
    "parking_category" "parking_category",
    "keys_left" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Via Privata Detta Sacra 33',
    "insurance_option_id" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "insurance_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "extras_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(10,2) NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "has_deposit" BOOLEAN NOT NULL DEFAULT true,
    "price_override" DECIMAL(10,2),
    "price_override_reason" TEXT,
    "price_override_by_id" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "check_in_at" TIMESTAMP(3),
    "check_in_km" INTEGER,
    "check_in_fuel" TEXT,
    "check_in_method" "check_in_method",
    "signature_url" TEXT,
    "otp_verified_at" TIMESTAMP(3),
    "operator_id" TEXT,
    "actual_return_at" TIMESTAMP(3),
    "check_out_km" INTEGER,
    "check_out_fuel" TEXT,
    "penalty_applied_at" TIMESTAMP(3),
    "penalty_amount" DECIMAL(10,2),
    "penalty_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_audits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "document_type" "document_type" NOT NULL,
    "file_url" TEXT NOT NULL,
    "status" "document_audit_status" NOT NULL DEFAULT 'pending',
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_reports" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "photo_urls" TEXT[],
    "notes" TEXT,
    "report_pdf_url" TEXT,
    "email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_tickets" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deposit_withheld_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "report_pdf_url" TEXT,
    "status" "damage_ticket_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "damage_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_requests" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "channel" "extension_channel" NOT NULL,
    "requested_end_date" TIMESTAMP(3) NOT NULL,
    "status" "extension_status" NOT NULL DEFAULT 'pending',
    "bumped_booking_id" TEXT,
    "reassigned_vehicle_id" TEXT,
    "decided_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" "payment_type" NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "stripe_payment_intent_id" TEXT,
    "capture_method" TEXT NOT NULL DEFAULT 'automatic',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "captured_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "parking_base_rates_category_key" ON "parking_base_rates"("category");

-- CreateIndex
CREATE UNIQUE INDEX "parking_capacity_slotType_key" ON "parking_capacity"("slotType");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_options_zone_tier_key" ON "insurance_options"("zone", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "extra_services_code_key" ON "extra_services"("code");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_vehicle_id_idx" ON "bookings"("vehicle_id");

-- CreateIndex
CREATE INDEX "bookings_start_date_end_date_idx" ON "bookings"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- AddForeignKey
ALTER TABLE "booking_extra_services" ADD CONSTRAINT "booking_extra_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extra_services" ADD CONSTRAINT "booking_extra_services_extra_service_id_fkey" FOREIGN KEY ("extra_service_id") REFERENCES "extra_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_insurance_option_id_fkey" FOREIGN KEY ("insurance_option_id") REFERENCES "insurance_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_price_override_by_id_fkey" FOREIGN KEY ("price_override_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_tickets" ADD CONSTRAINT "damage_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_bumped_booking_id_fkey" FOREIGN KEY ("bumped_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
