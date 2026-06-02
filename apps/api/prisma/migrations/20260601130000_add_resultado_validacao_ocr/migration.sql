-- AddResultadoValidacaoOcr
CREATE TYPE "ResultadoValidacaoOcr" AS ENUM ('VALIDO', 'SUSPEITO', 'INVALIDO');

ALTER TABLE "documento_admissao"
  ADD COLUMN "ocr_resultado" "ResultadoValidacaoOcr",
  ADD COLUMN "ocr_score" INTEGER,
  ADD COLUMN "ocr_motivos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "ocr_campos" JSONB;
