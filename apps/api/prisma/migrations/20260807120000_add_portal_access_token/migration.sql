-- AlterTable
ALTER TABLE "candidatura" ADD COLUMN "portal_access_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "candidatura_portal_access_token_key" ON "candidatura"("portal_access_token");
