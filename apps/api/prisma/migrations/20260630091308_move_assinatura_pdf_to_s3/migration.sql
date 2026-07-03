-- AlterTable
ALTER TABLE "documento_assinatura" ADD COLUMN     "conteudo_storage_path" TEXT,
ADD COLUMN     "empresa_pdf_final_storage_path" TEXT,
ALTER COLUMN "conteudo" DROP NOT NULL;
