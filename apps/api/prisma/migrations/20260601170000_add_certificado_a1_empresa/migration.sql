CREATE TABLE "empresa_certificado_a1" (
  "id" SERIAL NOT NULL,
  "empresa_id" INTEGER NOT NULL,
  "nome_arquivo" TEXT NOT NULL,
  "pfx_criptografado" TEXT NOT NULL,
  "senha_criptografada" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "serial_number" TEXT NOT NULL,
  "valido_de" TIMESTAMP(3) NOT NULL,
  "valido_ate" TIMESTAMP(3) NOT NULL,
  "thumbprint" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por_user_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "empresa_certificado_a1_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "empresa_certificado_a1_empresa_id_ativo_idx" ON "empresa_certificado_a1"("empresa_id", "ativo");

ALTER TABLE "empresa_certificado_a1" ADD CONSTRAINT "empresa_certificado_a1_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "empresa_certificado_a1" ADD CONSTRAINT "empresa_certificado_a1_criado_por_user_id_fkey" FOREIGN KEY ("criado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "TipoEventoAssinatura" ADD VALUE IF NOT EXISTS 'DOCUMENTO_CERTIFICADO_EMPRESA';

ALTER TABLE "documento_assinatura"
  ADD COLUMN "empresa_certificado_id" INTEGER,
  ADD COLUMN "empresa_assinou_em" TIMESTAMP(3),
  ADD COLUMN "empresa_cert_subject" TEXT,
  ADD COLUMN "empresa_cert_issuer" TEXT,
  ADD COLUMN "empresa_cert_serial" TEXT,
  ADD COLUMN "empresa_pdf_hash" TEXT,
  ADD COLUMN "empresa_pdf_final" BYTEA;
