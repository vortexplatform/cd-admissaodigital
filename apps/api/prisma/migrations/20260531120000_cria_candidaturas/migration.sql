-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('INSCRITO', 'EM_ANALISE', 'ENTREVISTA', 'APROVADO', 'REPROVADO', 'DESISTIU', 'CANCELADO');

-- AlterTable
ALTER TABLE "requisicao_vaga" ADD COLUMN "quantidadeVagas" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "candidatura" (
    "id" SERIAL NOT NULL,
    "requisicao_id" INTEGER NOT NULL,
    "candidato_id" INTEGER NOT NULL,
    "status" "StatusCandidatura" NOT NULL DEFAULT 'INSCRITO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidatura_pkey" PRIMARY KEY ("id")
);

-- Preserve existing one-candidate links as candidaturas before removing the old column.
INSERT INTO "candidatura" ("requisicao_id", "candidato_id", "status", "created_at", "updated_at")
SELECT "id", "candidatoId", 'INSCRITO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "requisicao_vaga"
WHERE "candidatoId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "requisicao_vaga" DROP CONSTRAINT IF EXISTS "requisicao_vaga_candidatoId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "requisicao_vaga_candidatoId_idx";

-- AlterTable
ALTER TABLE "requisicao_vaga" DROP COLUMN IF EXISTS "candidatoId";

-- CreateIndex
CREATE UNIQUE INDEX "candidatura_requisicao_id_candidato_id_key" ON "candidatura"("requisicao_id", "candidato_id");

-- CreateIndex
CREATE INDEX "candidatura_candidato_id_idx" ON "candidatura"("candidato_id");

-- CreateIndex
CREATE INDEX "candidatura_status_idx" ON "candidatura"("status");

-- AddForeignKey
ALTER TABLE "candidatura" ADD CONSTRAINT "candidatura_requisicao_id_fkey" FOREIGN KEY ("requisicao_id") REFERENCES "requisicao_vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatura" ADD CONSTRAINT "candidatura_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
