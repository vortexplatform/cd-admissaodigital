-- CreateEnum
CREATE TYPE "StatusRequisicaoVaga" AS ENUM ('RASCUNHO', 'ABERTA', 'AGUARDANDO_CANDIDATO', 'EM_ADMISSAO', 'AGUARDANDO_DOCUMENTOS', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_RH', 'PENDENTE_CORRECAO', 'APROVADA', 'INTEGRANDO_SENIOR', 'INTEGRADA_SENIOR', 'CANCELADA', 'REPROVADA', 'ERRO_INTEGRACAO');

-- CreateEnum
CREATE TYPE "TipoRequisicaoVaga" AS ENUM ('NOVA_VAGA', 'SUBSTITUICAO', 'AUMENTO_QUADRO', 'TEMPORARIA', 'OUTRO');

-- CreateTable
CREATE TABLE "requisicao_vaga" (
    "id" SERIAL NOT NULL,
    "candidatoId" INTEGER,
    "criadoPorUserId" INTEGER,
    "aprovadoPorUserId" INTEGER,
    "tipo" "TipoRequisicaoVaga" NOT NULL DEFAULT 'NOVA_VAGA',
    "status" "StatusRequisicaoVaga" NOT NULL DEFAULT 'RASCUNHO',
    "empresa" INTEGER,
    "filial" INTEGER,
    "cargo" TEXT,
    "centroCusto" TEXT,
    "escala" TEXT,
    "sindicato" TEXT,
    "dataPrevistaAdmissao" DATE,
    "motivoAbertura" TEXT,
    "observacao" TEXT,
    "codigoRequisicaoSenior" TEXT,
    "codigoCandidatoSenior" TEXT,
    "codigoColaboradorSenior" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "integradoSeniorEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisicao_vaga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requisicao_vaga_candidatoId_idx" ON "requisicao_vaga"("candidatoId");

-- CreateIndex
CREATE INDEX "requisicao_vaga_status_idx" ON "requisicao_vaga"("status");

-- CreateIndex
CREATE INDEX "requisicao_vaga_empresa_filial_idx" ON "requisicao_vaga"("empresa", "filial");

-- AddForeignKey
ALTER TABLE "requisicao_vaga" ADD CONSTRAINT "requisicao_vaga_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "candidato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao_vaga" ADD CONSTRAINT "requisicao_vaga_criadoPorUserId_fkey" FOREIGN KEY ("criadoPorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao_vaga" ADD CONSTRAINT "requisicao_vaga_aprovadoPorUserId_fkey" FOREIGN KEY ("aprovadoPorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
