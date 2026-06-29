-- CreateTable
CREATE TABLE "aceite_regulamento" (
    "id" SERIAL NOT NULL,
    "candidato_id" INTEGER NOT NULL,
    "documento_assinatura_id" INTEGER,
    "versao_regulamento" TEXT NOT NULL,
    "hash_regulamento" TEXT NOT NULL,
    "aceito_em" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "codigo_verificacao" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aceite_regulamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aceite_regulamento_codigo_verificacao_key" ON "aceite_regulamento"("codigo_verificacao");

-- CreateIndex
CREATE INDEX "aceite_regulamento_candidato_id_idx" ON "aceite_regulamento"("candidato_id");

-- AddForeignKey
ALTER TABLE "aceite_regulamento" ADD CONSTRAINT "aceite_regulamento_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
