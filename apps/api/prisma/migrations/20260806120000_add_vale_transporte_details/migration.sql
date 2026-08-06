ALTER TABLE "candidato_vale_transportes"
RENAME COLUMN "preco" TO "tarifa_unitaria";

ALTER TABLE "candidato_vale_transportes"
ADD COLUMN "vales_por_dia" INTEGER NOT NULL DEFAULT 1;
