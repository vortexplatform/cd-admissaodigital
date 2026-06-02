-- DropForeignKey
ALTER TABLE "documento_admissao" DROP CONSTRAINT "documento_admissao_dispensado_por_id_fkey";

-- AlterTable
ALTER TABLE "documento_admissao" ADD COLUMN     "observacao_candidato" TEXT,
ALTER COLUMN "ocr_validado_em" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "documento_admissao" ADD CONSTRAINT "documento_admissao_dispensado_por_id_fkey" FOREIGN KEY ("dispensado_por_id") REFERENCES "documento_admissao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
