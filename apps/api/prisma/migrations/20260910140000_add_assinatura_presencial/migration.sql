ALTER TYPE "MetodoAssinatura" ADD VALUE 'PRESENCIAL';
ALTER TYPE "TipoEventoAssinatura" ADD VALUE 'ASSINATURA_PRESENCIAL_INICIADA';
ALTER TYPE "TipoEventoAssinatura" ADD VALUE 'DOCUMENTO_ASSINADO_PRESENCIAL';
ALTER TYPE "TipoEventoAssinatura" ADD VALUE 'FOTO_ASSINATURA_PRESENCIAL_CAPTURADA';
ALTER TYPE "TipoEventoAssinatura" ADD VALUE 'ASSINATURA_PRESENCIAL_CONCLUIDA';

CREATE TYPE "StatusAssinaturaPresencial" AS ENUM ('EM_ANDAMENTO', 'FINALIZANDO', 'CONCLUIDA', 'EXPIRADA');

ALTER TABLE "documento_assinatura" ADD COLUMN "presencial_pdf_storage_path" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "presencial_foto_storage_path" TEXT;

CREATE TABLE "assinatura_presencial" (
  "id" SERIAL NOT NULL,
  "envelope_id" INTEGER NOT NULL,
  "iniciada_por_id" INTEGER NOT NULL,
  "tipo_signatario" "TipoSignatario" NOT NULL,
  "status" "StatusAssinaturaPresencial" NOT NULL DEFAULT 'EM_ANDAMENTO',
  "expira_em" TIMESTAMP(3) NOT NULL,
  "foto_storage_path" TEXT,
  "foto_mime_type" TEXT,
  "foto_capturada_em" TIMESTAMP(3),
  "ip" TEXT,
  "user_agent" TEXT,
  "concluida_em" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assinatura_presencial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assinatura_presencial_documento" (
  "id" SERIAL NOT NULL,
  "assinatura_id" INTEGER NOT NULL,
  "documento_id" INTEGER NOT NULL,
  "assinatura_storage_path" TEXT NOT NULL,
  "pagina" INTEGER NOT NULL,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "largura" DOUBLE PRECISION NOT NULL,
  "altura" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assinatura_presencial_documento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assinatura_presencial_envelope_id_status_idx" ON "assinatura_presencial"("envelope_id", "status");
CREATE UNIQUE INDEX "assinatura_presencial_documento_assinatura_id_documento_id_key" ON "assinatura_presencial_documento"("assinatura_id", "documento_id");

ALTER TABLE "assinatura_presencial" ADD CONSTRAINT "assinatura_presencial_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelope_assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinatura_presencial" ADD CONSTRAINT "assinatura_presencial_iniciada_por_id_fkey" FOREIGN KEY ("iniciada_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assinatura_presencial_documento" ADD CONSTRAINT "assinatura_presencial_documento_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinatura_presencial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinatura_presencial_documento" ADD CONSTRAINT "assinatura_presencial_documento_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento_assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
