-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('super_admin', 'admin', 'responsabile', 'operator', 'officina', 'contabilita', 'visualizzatore', 'client');

-- CreateEnum
CREATE TYPE "booking_service" AS ENUM ('rent', 'parking');

-- CreateEnum
CREATE TYPE "parking_slot_type" AS ENUM ('coperto', 'scoperto');

-- CreateEnum
CREATE TYPE "parking_category" AS ENUM ('moto', 'auto', 'furgone');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('available', 'rented', 'maintenance', 'guasto', 'fuori_flotta', 'non_disponibile');

-- CreateEnum
CREATE TYPE "vehicle_ownership_type" AS ENUM ('aziendale', 'leasing', 'sub_noleggio', 'comodato_uso', 'altro');

-- CreateEnum
CREATE TYPE "vehicle_exit_reason" AS ENUM ('venduta', 'rottamata', 'esportata', 'incidente', 'altro');

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
CREATE TYPE "contract_signature_status" AS ENUM ('none', 'link_sent', 'otp_pending', 'signed');

-- CreateEnum
CREATE TYPE "extension_channel" AS ENUM ('whatsapp', 'web');

-- CreateEnum
CREATE TYPE "extension_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "damage_ticket_status" AS ENUM ('open', 'deposit_withheld', 'resolved');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('rental_charge', 'deposit_authorization', 'kasko_charge', 'extra_charge', 'refund');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('contanti', 'pos', 'stripe', 'sumup', 'bonifico', 'altro');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'canceled');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'queued', 'sent', 'accepted', 'rejected', 'error');

-- CreateEnum
CREATE TYPE "workshop_category" AS ENUM ('meccanica', 'carrozzeria', 'gommista', 'elettrauto');

-- CreateEnum
CREATE TYPE "damage_record_type" AS ENUM ('graffio', 'ammaccatura', 'paraurti', 'vetro', 'pneumatico', 'interni', 'carrozzeria', 'meccanica', 'altro');

-- CreateEnum
CREATE TYPE "damage_record_status" AS ENUM ('aperto', 'in_valutazione', 'addebitato', 'chiuso');

-- CreateEnum
CREATE TYPE "claim_status" AS ENUM ('aperto', 'in_istruttoria', 'liquidazione', 'chiuso', 'respinto');

-- CreateEnum
CREATE TYPE "blacklist_reason" AS ENUM ('danno', 'mancato_pagamento', 'frode', 'comportamento_scorretto', 'incidente', 'documento_falso', 'altro');

-- CreateEnum
CREATE TYPE "blacklist_status" AS ENUM ('attiva', 'in_verifica', 'archiviata');

-- CreateEnum
CREATE TYPE "fine_status" AS ENUM ('da_notificare', 'notificata', 'in_ricorso', 'pagata', 'archiviata');

-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('carburante', 'operaio', 'ricambi', 'buoni_pasto', 'fornitori', 'altro');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('contratto_non_firmato', 'rientro_imminente', 'pagamento_scaduto', 'assicurazione_scadenza', 'revisione_scadenza', 'bollo_scadenza', 'manutenzione_scadenza', 'danno', 'multa', 'fattura_non_inviata', 'pec_non_inviata');

-- CreateEnum
CREATE TYPE "notification_severity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vat_number" TEXT,
    "pec" TEXT,
    "sdi_code" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "next_contract_number" INTEGER NOT NULL DEFAULT 1,
    "franchigia_rca_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "franchigia_rca_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "franchigia_kasko_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "franchigia_kasko_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "franchigia_furto_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "franchigia_furto_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "franchigia_incendio_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "franchigia_incendio_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "franchigia_danni_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "franchigia_danni_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "maintenance_interval_km" INTEGER NOT NULL DEFAULT 10000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "location_id" TEXT,
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
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT NOT NULL,
    "is_or_similar" BOOLEAN NOT NULL DEFAULT true,
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "status" "vehicle_status" NOT NULL DEFAULT 'available',
    "seats" INTEGER,
    "transmission" TEXT,
    "fuel_type" TEXT,
    "image_url" TEXT,
    "plate" TEXT,
    "chassis_number" TEXT,
    "year" INTEGER,
    "odometer_km" INTEGER,
    "maintenance_note" TEXT,
    "bollo_expiry_date" TIMESTAMP(3),
    "revisione_expiry_date" TIMESTAMP(3),
    "last_maintenance_km" INTEGER,
    "ownership_type" "vehicle_ownership_type" NOT NULL DEFAULT 'aziendale',
    "purchase_vendor" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_price" DECIMAL(10,2),
    "purchase_payment_method" TEXT,
    "purchase_invoice_url" TEXT,
    "exit_date" TIMESTAMP(3),
    "exit_reason" "vehicle_exit_reason",
    "gps_device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_insurance_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "rca_amount" DECIMAL(10,2),
    "rca_percent" DECIMAL(5,2),
    "kasko_amount" DECIMAL(10,2),
    "kasko_percent" DECIMAL(5,2),
    "theft_fire_amount" DECIMAL(10,2),
    "theft_fire_percent" DECIMAL(5,2),
    "damage_amount" DECIMAL(10,2),
    "damage_percent" DECIMAL(5,2),
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "premium" DECIMAL(10,2),
    "broker" TEXT,
    "roadside_assistance" BOOLEAN NOT NULL DEFAULT false,
    "gps_tracking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
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
    "tenant_id" TEXT NOT NULL,
    "category" "parking_category" NOT NULL,
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "coperto_uplift" DECIMAL(5,2) NOT NULL DEFAULT 0.40,

    CONSTRAINT "parking_base_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_capacity" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slotType" "parking_slot_type" NOT NULL,
    "max_slots" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_options" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
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
    "tenant_id" TEXT NOT NULL,
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
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "contract_number" INTEGER,
    "user_id" TEXT NOT NULL,
    "service_type" "booking_service" NOT NULL,
    "vehicle_id" TEXT,
    "authorized_drivers" JSONB,
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
    "down_payment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price_override" DECIMAL(10,2),
    "price_override_reason" TEXT,
    "price_override_by_id" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" "payment_method",
    "signature_status" "contract_signature_status" NOT NULL DEFAULT 'none',
    "signature_link_token" TEXT,
    "signature_sent_at" TIMESTAMP(3),
    "signature_completed_at" TIMESTAMP(3),
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
    "tenant_id" TEXT NOT NULL,
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
    "tenant_id" TEXT NOT NULL,
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
    "tenant_id" TEXT NOT NULL,
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
CREATE TABLE "damage_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "booking_id" TEXT,
    "customer_id" TEXT,
    "type" "damage_record_type" NOT NULL,
    "position" TEXT,
    "photo_urls" TEXT[],
    "video_urls" TEXT[],
    "document_urls" TEXT[],
    "cost_estimated" DECIMAL(10,2),
    "cost_final" DECIMAL(10,2),
    "franchigia_amount" DECIMAL(10,2),
    "status" "damage_record_status" NOT NULL DEFAULT 'aperto',
    "notes" TEXT,
    "operator_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "damage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "booking_id" TEXT,
    "customer_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "dynamics" TEXT,
    "photo_urls" TEXT[],
    "document_urls" TEXT[],
    "insurance_company" TEXT,
    "franchigia_amount" DECIMAL(10,2),
    "status" "claim_status" NOT NULL DEFAULT 'aperto',
    "costs" DECIMAL(10,2),
    "responsible_party" TEXT,
    "notes" TEXT,
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklist_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "full_name_snapshot" TEXT NOT NULL,
    "fiscal_code" TEXT,
    "contract_id" TEXT,
    "plate" TEXT,
    "reason" "blacklist_reason" NOT NULL,
    "details" TEXT NOT NULL,
    "amount_due" DECIMAL(10,2),
    "document_urls" TEXT[],
    "photo_urls" TEXT[],
    "status" "blacklist_status" NOT NULL DEFAULT 'attiva',
    "operator_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issuing_authorities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pec" TEXT,
    "source" TEXT,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issuing_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "contract_id" TEXT,
    "customer_id" TEXT,
    "violation_date" TIMESTAMP(3) NOT NULL,
    "violation_time" TEXT,
    "verbale_number" TEXT NOT NULL,
    "issuing_authority_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "document_url" TEXT,
    "status" "fine_status" NOT NULL DEFAULT 'da_notificare',
    "appeal_pdf_url" TEXT,
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_catalog_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category" "workshop_category" NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "workshop_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_interventions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "catalog_item_id" TEXT,
    "category" "workshop_category" NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "parts" TEXT,
    "supplier" TEXT,
    "km" INTEGER,
    "notes" TEXT,
    "document_url" TEXT,
    "invoice_url" TEXT,
    "operator_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "ocr_data" JSONB,
    "notes" TEXT,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
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
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" "payment_type" NOT NULL,
    "method" "payment_method" NOT NULL DEFAULT 'stripe',
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
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "taxable_amount" DECIMAL(10,2) NOT NULL,
    "vat_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "xml_url" TEXT,
    "sdi_receipt_url" TEXT,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category" "expense_category" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "severity" "notification_severity" NOT NULL DEFAULT 'info',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tenant_id_plate_key" ON "vehicles"("tenant_id", "plate");

-- CreateIndex
CREATE INDEX "vehicle_insurance_policies_tenant_id_idx" ON "vehicle_insurance_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "vehicle_insurance_policies_vehicle_id_idx" ON "vehicle_insurance_policies"("vehicle_id");

-- CreateIndex
CREATE INDEX "pricing_rules_tenant_id_idx" ON "pricing_rules"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_base_rates_tenant_id_category_key" ON "parking_base_rates"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "parking_capacity_tenant_id_slotType_key" ON "parking_capacity"("tenant_id", "slotType");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_options_tenant_id_zone_tier_key" ON "insurance_options"("tenant_id", "zone", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "extra_services_tenant_id_code_key" ON "extra_services"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_signature_link_token_key" ON "bookings"("signature_link_token");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_idx" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_vehicle_id_idx" ON "bookings"("vehicle_id");

-- CreateIndex
CREATE INDEX "bookings_start_date_end_date_idx" ON "bookings"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tenant_id_contract_number_key" ON "bookings"("tenant_id", "contract_number");

-- CreateIndex
CREATE INDEX "document_audits_tenant_id_idx" ON "document_audits"("tenant_id");

-- CreateIndex
CREATE INDEX "damage_reports_tenant_id_idx" ON "damage_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "damage_tickets_tenant_id_idx" ON "damage_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "damage_records_tenant_id_idx" ON "damage_records"("tenant_id");

-- CreateIndex
CREATE INDEX "damage_records_vehicle_id_idx" ON "damage_records"("vehicle_id");

-- CreateIndex
CREATE INDEX "claims_tenant_id_idx" ON "claims"("tenant_id");

-- CreateIndex
CREATE INDEX "blacklist_entries_tenant_id_idx" ON "blacklist_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "issuing_authorities_tenant_id_idx" ON "issuing_authorities"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "issuing_authorities_tenant_id_name_key" ON "issuing_authorities"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "fines_tenant_id_idx" ON "fines"("tenant_id");

-- CreateIndex
CREATE INDEX "fines_plate_idx" ON "fines"("plate");

-- CreateIndex
CREATE INDEX "workshop_catalog_items_tenant_id_idx" ON "workshop_catalog_items"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_catalog_items_tenant_id_category_label_key" ON "workshop_catalog_items"("tenant_id", "category", "label");

-- CreateIndex
CREATE INDEX "workshop_interventions_tenant_id_idx" ON "workshop_interventions"("tenant_id");

-- CreateIndex
CREATE INDEX "workshop_interventions_vehicle_id_idx" ON "workshop_interventions"("vehicle_id");

-- CreateIndex
CREATE INDEX "documents_tenant_id_idx" ON "documents"("tenant_id");

-- CreateIndex
CREATE INDEX "documents_entity_type_entity_id_idx" ON "documents"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "extension_requests_tenant_id_idx" ON "extension_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_stripe_payment_intent_id_idx" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_number_key" ON "invoices"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_idx" ON "expenses"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_idx" ON "audit_log"("tenant_id");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_insurance_policies" ADD CONSTRAINT "vehicle_insurance_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_insurance_policies" ADD CONSTRAINT "vehicle_insurance_policies_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_base_rates" ADD CONSTRAINT "parking_base_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_capacity" ADD CONSTRAINT "parking_capacity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_options" ADD CONSTRAINT "insurance_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_services" ADD CONSTRAINT "extra_services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extra_services" ADD CONSTRAINT "booking_extra_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extra_services" ADD CONSTRAINT "booking_extra_services_extra_service_id_fkey" FOREIGN KEY ("extra_service_id") REFERENCES "extra_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audits" ADD CONSTRAINT "document_audits_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_tickets" ADD CONSTRAINT "damage_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_tickets" ADD CONSTRAINT "damage_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_records" ADD CONSTRAINT "damage_records_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issuing_authorities" ADD CONSTRAINT "issuing_authorities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_issuing_authority_id_fkey" FOREIGN KEY ("issuing_authority_id") REFERENCES "issuing_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_catalog_items" ADD CONSTRAINT "workshop_catalog_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_interventions" ADD CONSTRAINT "workshop_interventions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_interventions" ADD CONSTRAINT "workshop_interventions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_interventions" ADD CONSTRAINT "workshop_interventions_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "workshop_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_interventions" ADD CONSTRAINT "workshop_interventions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_bumped_booking_id_fkey" FOREIGN KEY ("bumped_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
