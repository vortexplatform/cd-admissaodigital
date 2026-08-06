-- CreateEnum
CREATE TYPE "TipoSignatario" AS ENUM ('CANDIDATO', 'RESPONSAVEL');

-- AlterTable: adicionar campos do responsável legal no candidato
ALTER TABLE "candidato" ADD COLUMN "responsavel_nome" TEXT;
ALTER TABLE "candidato" ADD COLUMN "responsavel_cpf" TEXT;
ALTER TABLE "candidato" ADD COLUMN "responsavel_email" TEXT;
ALTER TABLE "candidato" ADD COLUMN "responsavel_telefone" TEXT;

-- AlterTable: adicionar tipo_signatario e access_token no envelope_assinatura
ALTER TABLE "envelope_assinatura" ADD COLUMN "tipo_signatario" "TipoSignatario" NOT NULL DEFAULT 'CANDIDATO';
ALTER TABLE "envelope_assinatura" ADD COLUMN "access_token" TEXT;

-- DropIndex: remover unique constraint antiga
DROP INDEX "envelope_assinatura_candidatura_id_setor_key";

-- CreateIndex: nova unique constraint com tipo_signatario
CREATE UNIQUE INDEX "envelope_assinatura_candidatura_id_setor_tipo_signatario_key" ON "envelope_assinatura"("candidatura_id", "setor", "tipo_signatario");

-- CreateIndex: unique index no access_token
CREATE UNIQUE INDEX "envelope_assinatura_access_token_key" ON "envelope_assinatura"("access_token");
