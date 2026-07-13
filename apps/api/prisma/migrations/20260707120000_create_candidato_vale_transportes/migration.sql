-- CreateTable
CREATE TABLE "candidato_vale_transportes" (
    "id" SERIAL NOT NULL,
    "candidato_id" INTEGER NOT NULL,
    "tipo_transporte" TEXT NOT NULL,
    "tipo_trajeto" TEXT NOT NULL,
    "transporte_usado" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidato_vale_transportes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidato_vale_transportes_candidato_id_idx" ON "candidato_vale_transportes"("candidato_id");

-- AddForeignKey
ALTER TABLE "candidato_vale_transportes" ADD CONSTRAINT "candidato_vale_transportes_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
