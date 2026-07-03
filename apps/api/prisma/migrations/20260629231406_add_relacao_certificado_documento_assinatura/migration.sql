-- AddForeignKey
ALTER TABLE "documento_assinatura" ADD CONSTRAINT "documento_assinatura_empresa_certificado_id_fkey" FOREIGN KEY ("empresa_certificado_id") REFERENCES "empresa_certificado_a1"("id") ON DELETE SET NULL ON UPDATE CASCADE;
