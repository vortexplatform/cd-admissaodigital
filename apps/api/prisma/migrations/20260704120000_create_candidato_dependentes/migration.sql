CREATE TABLE "candidato_dependentes" (
    "id" SERIAL NOT NULL,
    "candidato_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_grau_parentesco" TEXT NOT NULL,
    "descricao_grau_parentesco" TEXT NOT NULL,
    "codigo_tipo_esocial" INTEGER NOT NULL,
    "descricao_tipo_esocial" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "dependente_ir" BOOLEAN NOT NULL DEFAULT false,
    "data_nascimento" DATE NOT NULL,
    "cpf" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidato_dependentes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "candidato_dependentes_candidato_id_idx" ON "candidato_dependentes"("candidato_id");

ALTER TABLE "candidato_dependentes" ADD CONSTRAINT "candidato_dependentes_candidato_id_fkey" FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
