-- AddOcrEDispensacaoDocumento
ALTER TABLE "documento_admissao"
  ADD COLUMN "ocr_texto" TEXT,
  ADD COLUMN "ocr_validado_em" TIMESTAMPTZ,
  ADD COLUMN "dispensado_por_id" INTEGER REFERENCES "documento_admissao"("id") ON DELETE SET NULL;

CREATE INDEX "documento_admissao_dispensado_por_id_idx" ON "documento_admissao"("dispensado_por_id");
