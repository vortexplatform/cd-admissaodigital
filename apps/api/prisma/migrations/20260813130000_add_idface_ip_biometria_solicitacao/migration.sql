ALTER TABLE "biometria_solicitacao" ADD COLUMN "idface_ip" TEXT;
CREATE INDEX "biometria_solicitacao_idface_ip_status_idx" ON "biometria_solicitacao" ("idface_ip", "status");
