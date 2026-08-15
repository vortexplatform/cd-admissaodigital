-- DropIndex
DROP INDEX IF EXISTS "documento_assinatura_responsavel_codigo_verificacao_key";

-- AlterTable
ALTER TABLE "documento_assinatura" DROP COLUMN IF EXISTS "responsavel_codigo_verificacao";
