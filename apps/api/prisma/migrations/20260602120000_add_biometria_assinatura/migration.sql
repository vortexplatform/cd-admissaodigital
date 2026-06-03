CREATE TYPE "MetodoAssinatura" AS ENUM ('OTP', 'BIOMETRIA');
CREATE TYPE "BiometriaStatus" AS ENUM ('NAO_CADASTRADA', 'CADASTRADA', 'ERRO');
CREATE TYPE "TipoBiometriaSolicitacao" AS ENUM ('CADASTRO', 'VERIFICACAO_ASSINATURA');
CREATE TYPE "StatusBiometriaSolicitacao" AS ENUM ('PENDENTE', 'EM_ATENDIMENTO', 'CONCLUIDA', 'REPROVADA', 'FALHOU', 'EXPIRADA', 'CANCELADA');
CREATE TYPE "ResultadoBiometriaSolicitacao" AS ENUM ('APROVADO', 'REPROVADO', 'FALHOU');

ALTER TYPE "TipoEventoAssinatura" ADD VALUE 'DOCUMENTO_ASSINADO_BIOMETRIA';

ALTER TABLE "candidato"
  ADD COLUMN "biometria_status" "BiometriaStatus" NOT NULL DEFAULT 'NAO_CADASTRADA',
  ADD COLUMN "biometria_cadastrada_em" TIMESTAMP(3),
  ADD COLUMN "biometria_identificador_externo" TEXT;

CREATE TABLE "biometria_dispositivo" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ultimo_ping_em" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "biometria_dispositivo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "biometria_solicitacao" (
  "id" SERIAL NOT NULL,
  "tipo" "TipoBiometriaSolicitacao" NOT NULL,
  "status" "StatusBiometriaSolicitacao" NOT NULL DEFAULT 'PENDENTE',
  "candidato_id" INTEGER NOT NULL,
  "candidatura_id" INTEGER,
  "envelope_id" INTEGER,
  "solicitada_por_id" INTEGER NOT NULL,
  "dispositivo_id" INTEGER,
  "expira_em" TIMESTAMP(3) NOT NULL,
  "assumida_em" TIMESTAMP(3),
  "concluida_em" TIMESTAMP(3),
  "resultado" "ResultadoBiometriaSolicitacao",
  "cpf_retornado" TEXT,
  "score" INTEGER,
  "identificador_externo" TEXT,
  "mensagem" TEXT,
  "ip_resultado" TEXT,
  "user_agent_resultado" TEXT,
  "payload_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "biometria_solicitacao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "documento_assinatura"
  ADD COLUMN "metodo_assinatura" "MetodoAssinatura",
  ADD COLUMN "biometria_solicitacao_id" INTEGER;

CREATE UNIQUE INDEX "biometria_dispositivo_token_hash_key" ON "biometria_dispositivo"("token_hash");
CREATE INDEX "biometria_solicitacao_status_expira_em_idx" ON "biometria_solicitacao"("status", "expira_em");
CREATE INDEX "biometria_solicitacao_candidato_id_idx" ON "biometria_solicitacao"("candidato_id");
CREATE INDEX "biometria_solicitacao_envelope_id_idx" ON "biometria_solicitacao"("envelope_id");
CREATE INDEX "biometria_solicitacao_dispositivo_id_idx" ON "biometria_solicitacao"("dispositivo_id");
CREATE INDEX "documento_assinatura_biometria_solicitacao_id_idx" ON "documento_assinatura"("biometria_solicitacao_id");

ALTER TABLE "biometria_solicitacao" ADD CONSTRAINT "biometria_solicitacao_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "biometria_solicitacao" ADD CONSTRAINT "biometria_solicitacao_candidatura_id_fkey" FOREIGN KEY ("candidatura_id") REFERENCES "candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "biometria_solicitacao" ADD CONSTRAINT "biometria_solicitacao_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelope_assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "biometria_solicitacao" ADD CONSTRAINT "biometria_solicitacao_solicitada_por_id_fkey" FOREIGN KEY ("solicitada_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "biometria_solicitacao" ADD CONSTRAINT "biometria_solicitacao_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "biometria_dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documento_assinatura" ADD CONSTRAINT "documento_assinatura_biometria_solicitacao_id_fkey" FOREIGN KEY ("biometria_solicitacao_id") REFERENCES "biometria_solicitacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
