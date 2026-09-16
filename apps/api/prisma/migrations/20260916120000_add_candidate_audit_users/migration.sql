ALTER TABLE "candidato"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidato_dados_vaga"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidato_loja_proxima"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidato_experiencia"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidato_dependentes"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidato_vale_transportes"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidato_etapas"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "aceite_regulamento"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "candidatura"
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "envelope_assinatura"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "documento_assinatura"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "assinatura_presencial"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "assinatura_presencial_documento"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "evento_assinatura"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "documento_admissao"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "biometria_template"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;

ALTER TABLE "biometria_solicitacao"
  ADD COLUMN "criado_por_user_id" INTEGER,
  ADD COLUMN "editado_por_user_id" INTEGER;
