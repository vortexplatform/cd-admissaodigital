-- AlterTable
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinatura_nome" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinatura_cpf" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinado_em" TIMESTAMP(3);
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinatura_ip" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinatura_user_agent" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinatura_email" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_assinatura_telefone" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_metodo_assinatura" "MetodoAssinatura";
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_codigo_verificacao" TEXT;
ALTER TABLE "documento_assinatura" ADD COLUMN "responsavel_hash_assinado" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "documento_assinatura_responsavel_codigo_verificacao_key" ON "documento_assinatura"("responsavel_codigo_verificacao");
