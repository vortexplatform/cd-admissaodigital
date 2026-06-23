-- AlterTable
ALTER TABLE "candidatura" ADD COLUMN     "admissao_gerada_por_user_id" INTEGER,
ADD COLUMN     "criado_por_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "candidatura" ADD CONSTRAINT "candidatura_criado_por_user_id_fkey" FOREIGN KEY ("criado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatura" ADD CONSTRAINT "candidatura_admissao_gerada_por_user_id_fkey" FOREIGN KEY ("admissao_gerada_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
