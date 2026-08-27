-- DropIndex
DROP INDEX "payments_stripe_payment_intent_id_key";

-- CreateIndex
CREATE INDEX "payments_stripe_payment_intent_id_idx" ON "payments"("stripe_payment_intent_id");
