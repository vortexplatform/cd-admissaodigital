ALTER TABLE "candidato" ADD COLUMN "genero" TEXT;
ALTER TABLE "candidato" ADD COLUMN "possui_filhos" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "ModoSubstituicaoDocumento" AS ENUM ('SEMPRE', 'CAMPO_OCR');

CREATE TABLE "documento_template" (
  "id" SERIAL NOT NULL,
  "empresa_id" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "palavras_chave" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mime_types_permitidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "condicao_genero" TEXT,
  "condicao_possui_filhos" BOOLEAN,
  "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "documento_template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documento_template_substituicao" (
  "id" SERIAL NOT NULL,
  "template_id" INTEGER NOT NULL,
  "substituido_template_id" INTEGER NOT NULL,
  "modo" "ModoSubstituicaoDocumento" NOT NULL DEFAULT 'SEMPRE',
  "campo_ocr" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "documento_template_substituicao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "documento_admissao" ADD COLUMN "template_id" INTEGER;

CREATE UNIQUE INDEX "documento_template_empresa_id_codigo_key" ON "documento_template"("empresa_id", "codigo");
CREATE INDEX "documento_template_empresa_id_ordem_idx" ON "documento_template"("empresa_id", "ordem");
CREATE UNIQUE INDEX "documento_template_substituicao_template_id_substituido_template_id_key" ON "documento_template_substituicao"("template_id", "substituido_template_id");
CREATE INDEX "documento_template_substituicao_substituido_template_id_idx" ON "documento_template_substituicao"("substituido_template_id");

ALTER TABLE "documento_template"
  ADD CONSTRAINT "documento_template_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documento_template_substituicao"
  ADD CONSTRAINT "documento_template_substituicao_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "documento_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documento_template_substituicao"
  ADD CONSTRAINT "documento_template_substituicao_substituido_template_id_fkey"
  FOREIGN KEY ("substituido_template_id") REFERENCES "documento_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documento_admissao"
  ADD CONSTRAINT "documento_admissao_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "documento_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
