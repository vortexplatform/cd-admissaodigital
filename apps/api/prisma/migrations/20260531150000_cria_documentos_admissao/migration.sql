CREATE TYPE "StatusDocumentoAdmissao" AS ENUM (
  'PENDENTE',
  'ENVIADO',
  'EM_ANALISE',
  'APROVADO',
  'RECUSADO',
  'REENVIO_SOLICITADO'
);

CREATE TYPE "OrigemDocumentoAdmissao" AS ENUM ('CANDIDATO', 'RH');

CREATE TABLE "documento_admissao" (
  "id" SERIAL NOT NULL,
  "candidatura_id" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
  "status" "StatusDocumentoAdmissao" NOT NULL DEFAULT 'PENDENTE',
  "origem" "OrigemDocumentoAdmissao",
  "arquivo_nome" TEXT,
  "mime_type" TEXT,
  "tamanho_bytes" INTEGER,
  "storage_path" TEXT,
  "enviado_em" TIMESTAMP(3),
  "revisado_em" TIMESTAMP(3),
  "revisado_por_id" INTEGER,
  "observacao_rh" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "documento_admissao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documento_admissao_candidatura_id_codigo_key" ON "documento_admissao"("candidatura_id", "codigo");
CREATE INDEX "documento_admissao_status_idx" ON "documento_admissao"("status");
CREATE INDEX "documento_admissao_candidatura_id_idx" ON "documento_admissao"("candidatura_id");

ALTER TABLE "documento_admissao"
  ADD CONSTRAINT "documento_admissao_candidatura_id_fkey"
  FOREIGN KEY ("candidatura_id") REFERENCES "candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documento_admissao"
  ADD CONSTRAINT "documento_admissao_revisado_por_id_fkey"
  FOREIGN KEY ("revisado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
