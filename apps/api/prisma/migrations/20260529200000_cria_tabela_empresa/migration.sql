-- CreateTable
CREATE TABLE "empresa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_empresa_senior" TEXT NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_codigo_empresa_senior_key" ON "empresa"("codigo_empresa_senior");

-- AddForeignKey
ALTER TABLE "requisicao_vaga" ADD CONSTRAINT "requisicao_vaga_empresa_fkey" FOREIGN KEY ("empresa") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
