-- AlterTable
ALTER TABLE "documento_assinatura" ADD COLUMN     "assinatura_email" TEXT,
ADD COLUMN     "assinatura_telefone" TEXT,
ADD COLUMN     "empresa_ip" TEXT,
ADD COLUMN     "empresa_representante_cargo" TEXT,
ADD COLUMN     "empresa_representante_cpf" TEXT,
ADD COLUMN     "empresa_representante_email" TEXT,
ADD COLUMN     "empresa_representante_nome" TEXT,
ADD COLUMN     "empresa_user_agent" TEXT;
