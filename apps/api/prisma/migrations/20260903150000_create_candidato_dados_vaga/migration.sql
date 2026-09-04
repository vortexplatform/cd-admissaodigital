CREATE TABLE "candidato_dados_vaga" (
    "id_candidato" INTEGER NOT NULL,
    "bairro" TEXT NOT NULL,
    "estudo_horario" TEXT,
    "disponibilidade_horario" BOOLEAN,
    "nome_pai" TEXT,
    "nome_mae" TEXT,
    "indicado_funcionario" BOOLEAN,
    "indicado_loja_setor" TEXT,
    "parente_empresa" BOOLEAN,
    "parente_nome" TEXT,
    "parente_loja_setor" TEXT,
    "aposentado" BOOLEAN,
    "aposentadoria_tipo" TEXT,
    "conducao_propria" TEXT,
    CONSTRAINT "candidato_dados_vaga_pkey" PRIMARY KEY ("id_candidato"),
    CONSTRAINT "candidato_dados_vaga_id_candidato_fkey" FOREIGN KEY ("id_candidato") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "candidato_loja_proxima" (
    "id_candidato" INTEGER NOT NULL,
    "codfil" INTEGER NOT NULL,
    CONSTRAINT "candidato_loja_proxima_pkey" PRIMARY KEY ("id_candidato", "codfil"),
    CONSTRAINT "candidato_loja_proxima_id_candidato_fkey" FOREIGN KEY ("id_candidato") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "candidato_experiencia" (
    "id_candidato" INTEGER NOT NULL,
    "id" INTEGER NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "admissao" DATE,
    "demissao" DATE,
    "motivo_saida" TEXT,
    CONSTRAINT "candidato_experiencia_pkey" PRIMARY KEY ("id_candidato", "id"),
    CONSTRAINT "candidato_experiencia_id_candidato_fkey" FOREIGN KEY ("id_candidato") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
