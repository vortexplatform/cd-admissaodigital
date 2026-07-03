-- AlterTable
ALTER TABLE "envelope_assinatura" ADD COLUMN     "gerado_por_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "envelope_assinatura" ADD CONSTRAINT "envelope_assinatura_gerado_por_user_id_fkey" FOREIGN KEY ("gerado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
