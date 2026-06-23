CREATE TABLE "integration_client" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_client_client_id_key" ON "integration_client"("client_id");
CREATE INDEX "integration_client_ativo_idx" ON "integration_client"("ativo");
