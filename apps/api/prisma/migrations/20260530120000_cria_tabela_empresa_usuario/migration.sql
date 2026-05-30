-- CreateTable
CREATE TABLE "empresa_usuario" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_usuario_user_id_empresa_id_key" ON "empresa_usuario"("user_id", "empresa_id");

-- CreateIndex
CREATE INDEX "empresa_usuario_empresa_id_idx" ON "empresa_usuario"("empresa_id");

-- AddForeignKey
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "empresa_usuario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "empresa_usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
