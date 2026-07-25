CREATE TABLE "cidade_vaga" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  CONSTRAINT "cidade_vaga_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cidade_vaga_nome_key" ON "cidade_vaga"("nome");

INSERT INTO "cidade_vaga" ("nome") VALUES
  ('Governador Valadares'),
  ('Ipatinga'),
  ('Coronel Fabriciano'),
  ('Timóteo'),
  ('Caratinga'),
  ('Manhuaçu'),
  ('Teófilo Otoni'),
  ('Nanuque');

ALTER TABLE "candidato" ADD COLUMN "cidade_vaga_id" INTEGER;

UPDATE "candidato"
SET "cidade_vaga_id" = (
  SELECT "id" FROM "cidade_vaga" WHERE "nome" = 'Governador Valadares'
);

ALTER TABLE "candidato" ALTER COLUMN "cidade_vaga_id" SET NOT NULL;
ALTER TABLE "candidato"
  ADD CONSTRAINT "candidato_cidade_vaga_id_fkey"
  FOREIGN KEY ("cidade_vaga_id") REFERENCES "cidade_vaga"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "candidato_cidade_vaga_id_idx" ON "candidato"("cidade_vaga_id");
