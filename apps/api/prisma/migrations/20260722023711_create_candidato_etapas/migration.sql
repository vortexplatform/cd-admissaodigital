-- CreateTable
CREATE TABLE "candidato_etapas" (
    "id" SERIAL NOT NULL,
    "candidato_id" INTEGER NOT NULL,
    "codigo_etapa" INTEGER NOT NULL,
    "descricao_etapa" TEXT NOT NULL,
    "data" DATE,
    "sequencia" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidato_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidato_etapas_candidato_id_idx" ON "candidato_etapas"("candidato_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidato_etapas_candidato_id_codigo_etapa_key" ON "candidato_etapas"("candidato_id", "codigo_etapa");

-- AddForeignKey
ALTER TABLE "candidato_etapas" ADD CONSTRAINT "candidato_etapas_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
