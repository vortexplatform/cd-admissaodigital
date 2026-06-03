-- CreateTable
CREATE TABLE "biometria_template" (
    "id" SERIAL NOT NULL,
    "candidato_id" INTEGER NOT NULL,
    "template" BYTEA NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometria_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biometria_template_candidato_id_idx" ON "biometria_template"("candidato_id");

-- AddForeignKey
ALTER TABLE "biometria_template" ADD CONSTRAINT "biometria_template_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
