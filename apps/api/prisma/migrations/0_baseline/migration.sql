CREATE TYPE "Role" AS ENUM ('CANDIDATO', 'RH', 'ADMIN');

CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "cpf" TEXT,
    "nome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CANDIDATO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_telefone_key" ON "users"("telefone");

CREATE TABLE "codeotp" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "codeotp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "codeotp_identifier_idx" ON "codeotp"("identifier");

CREATE TABLE "candidato" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "cpf" TEXT NOT NULL,
    "dataNascimento" DATE NOT NULL,
    "nome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    CONSTRAINT "candidato_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "candidato_userId_key" ON "candidato"("userId");
CREATE UNIQUE INDEX "candidato_cpf_key" ON "candidato"("cpf");
ALTER TABLE "candidato" ADD CONSTRAINT "candidato_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
