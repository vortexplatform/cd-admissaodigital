CREATE TYPE "SetorAssinatura" AS ENUM ('ADM_PESSOAL', 'SESMT');
CREATE TYPE "StatusEnvelopeAssinatura" AS ENUM ('RASCUNHO', 'AGUARDANDO_OTP', 'OTP_VALIDADO', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE "StatusDocumentoAssinatura" AS ENUM ('PENDENTE', 'ASSINADO', 'CANCELADO');
CREATE TYPE "TipoEventoAssinatura" AS ENUM ('ENVELOPE_CRIADO', 'OTP_ENVIADO', 'OTP_VALIDADO', 'DOCUMENTO_VISUALIZADO', 'DOCUMENTO_ASSINADO', 'ENVELOPE_CONCLUIDO');

CREATE TABLE "envelope_assinatura" (
  "id" SERIAL NOT NULL,
  "candidatura_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "setor" "SetorAssinatura" NOT NULL,
  "status" "StatusEnvelopeAssinatura" NOT NULL DEFAULT 'RASCUNHO',
  "otp_identifier" TEXT,
  "otp_validado_em" TIMESTAMP(3),
  "session_token" TEXT,
  "session_expira_em" TIMESTAMP(3),
  "concluido_em" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "envelope_assinatura_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documento_assinatura" (
  "id" SERIAL NOT NULL,
  "envelope_id" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "conteudo" TEXT NOT NULL,
  "hash_original" TEXT NOT NULL,
  "hash_assinado" TEXT,
  "status" "StatusDocumentoAssinatura" NOT NULL DEFAULT 'PENDENTE',
  "visualizado_em" TIMESTAMP(3),
  "assinado_em" TIMESTAMP(3),
  "assinatura_nome" TEXT,
  "assinatura_cpf" TEXT,
  "assinatura_ip" TEXT,
  "assinatura_user_agent" TEXT,
  "codigo_verificacao" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "documento_assinatura_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evento_assinatura" (
  "id" SERIAL NOT NULL,
  "envelope_id" INTEGER NOT NULL,
  "documento_id" INTEGER,
  "tipo" "TipoEventoAssinatura" NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evento_assinatura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "envelope_assinatura_session_token_key" ON "envelope_assinatura"("session_token");
CREATE UNIQUE INDEX "envelope_assinatura_candidatura_id_setor_key" ON "envelope_assinatura"("candidatura_id", "setor");
CREATE INDEX "envelope_assinatura_user_id_idx" ON "envelope_assinatura"("user_id");
CREATE INDEX "envelope_assinatura_status_idx" ON "envelope_assinatura"("status");
CREATE UNIQUE INDEX "documento_assinatura_codigo_verificacao_key" ON "documento_assinatura"("codigo_verificacao");
CREATE UNIQUE INDEX "documento_assinatura_envelope_id_codigo_key" ON "documento_assinatura"("envelope_id", "codigo");
CREATE INDEX "documento_assinatura_status_idx" ON "documento_assinatura"("status");
CREATE INDEX "evento_assinatura_envelope_id_created_at_idx" ON "evento_assinatura"("envelope_id", "created_at");

ALTER TABLE "envelope_assinatura" ADD CONSTRAINT "envelope_assinatura_candidatura_id_fkey" FOREIGN KEY ("candidatura_id") REFERENCES "candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envelope_assinatura" ADD CONSTRAINT "envelope_assinatura_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documento_assinatura" ADD CONSTRAINT "documento_assinatura_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelope_assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evento_assinatura" ADD CONSTRAINT "evento_assinatura_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelope_assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
