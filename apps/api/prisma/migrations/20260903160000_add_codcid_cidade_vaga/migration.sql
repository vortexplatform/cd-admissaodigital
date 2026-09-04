ALTER TABLE "cidade_vaga" ADD COLUMN "codcid" INTEGER;

UPDATE "cidade_vaga" SET "codcid" = 3127701 WHERE "nome" = 'Governador Valadares';
UPDATE "cidade_vaga" SET "codcid" = 3131307 WHERE "nome" = 'Ipatinga';
UPDATE "cidade_vaga" SET "codcid" = 3119401 WHERE "nome" = 'Coronel Fabriciano';
UPDATE "cidade_vaga" SET "codcid" = 3168701 WHERE "nome" = 'Timóteo';
UPDATE "cidade_vaga" SET "codcid" = 3113404 WHERE "nome" = 'Caratinga';
UPDATE "cidade_vaga" SET "codcid" = 3139409 WHERE "nome" = 'Manhuaçu';
UPDATE "cidade_vaga" SET "codcid" = 3168606 WHERE "nome" = 'Teófilo Otoni';
UPDATE "cidade_vaga" SET "codcid" = 3144302 WHERE "nome" = 'Nanuque';

ALTER TABLE "cidade_vaga" ALTER COLUMN "codcid" SET NOT NULL;
CREATE UNIQUE INDEX "cidade_vaga_codcid_key" ON "cidade_vaga"("codcid");
