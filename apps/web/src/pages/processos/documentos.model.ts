export type StatusDocumentoAdmissao =
  | 'PENDENTE'
  | 'ENVIADO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'RECUSADO'
  | 'REENVIO_SOLICITADO';

export interface DocumentoAdmissao {
  id: number;
  codigo: string;
  templateId: number | null;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  status: StatusDocumentoAdmissao;
  origem: 'CANDIDATO' | 'RH' | null;
  arquivoNome: string | null;
  mimeType: string | null;
  tamanhoBytes: number | null;
  enviadoEm: string | null;
  revisadoEm: string | null;
  observacaoRh: string | null;
  observacaoCandidato: string | null;
  ocrTexto: string | null;
  ocrResultado: 'VALIDO' | 'SUSPEITO' | 'INVALIDO' | null;
  ocrScore: number | null;
  ocrMotivos: string[];
  ocrCampos: Record<string, unknown> | null;
  ocrValidadoEm: string | null;
  dispensadoPorId: number | null;
  dispensadoPor: { id: number; nome: string } | null;
  template: {
    palavrasChave: string[];
    substitui: {
      substituidoTemplateId: number;
      modo: 'SEMPRE' | 'CAMPO_OCR';
      campoOcr: string | null;
    }[];
  } | null;
}

export interface DocumentosCandidatura {
  id: number;
  status: string;
  admissao: string | null;
  candidato: {
    id: number;
    nome: string | null;
    cpf: string;
    email: string | null;
    telefone: string | null;
    biometriaStatus?: 'NAO_CADASTRADA' | 'CADASTRADA' | 'ERRO';
    biometriaCadastradaEm?: string | null;
    biometriaIdentificadorExterno?: string | null;
  };
  requisicao: {
    id: number;
    cargo: string | null;
    cargoNome: string | null;
    ccustoNome: string | null;
    filial: number | null;
    dataPrevistaAdmissao: string | null;
    empresa: { nome: string } | null;
  };
  documentos: DocumentoAdmissao[];
}

export type StatusEnvelopeAssinatura =
  | 'RASCUNHO'
  | 'AGUARDANDO_OTP'
  | 'OTP_VALIDADO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type StatusDocumentoAssinatura = 'PENDENTE' | 'ASSINADO' | 'CANCELADO';

export interface DocumentoAssinatura {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: StatusDocumentoAssinatura;
  hashOriginal: string;
  hashAssinado: string | null;
  visualizadoEm: string | null;
  assinadoEm: string | null;
  metodoAssinatura: 'OTP' | 'BIOMETRIA' | null;
  codigoVerificacao: string | null;
}

export interface EnvelopeAssinatura {
  id: number;
  setor: 'ADM_PESSOAL' | 'SESMT';
  status: StatusEnvelopeAssinatura;
  otpValidadoEm: string | null;
  sessionExpiraEm: string | null;
  concluidoEm: string | null;
  documentos: DocumentoAssinatura[];
}

export interface AssinaturasCandidatura extends Omit<DocumentosCandidatura, 'documentos'> {
  envelopesAssinatura: EnvelopeAssinatura[];
}

export const documentoStatusLabels: Record<StatusDocumentoAdmissao, string> = {
  PENDENTE: 'Pendente',
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  REENVIO_SOLICITADO: 'Reenvio solicitado',
};

export const documentoStatusTone: Record<StatusDocumentoAdmissao, string> = {
  PENDENTE: 'border-slate-300 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  ENVIADO: 'border-sky-300 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  EM_ANALISE: 'border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  APROVADO: 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  RECUSADO: 'border-red-300 bg-red-500/10 text-red-700 dark:text-red-200',
  REENVIO_SOLICITADO: 'border-orange-300 bg-orange-500/10 text-orange-700 dark:text-orange-200',
};

export const formatCandidaturaTitle = (item: { requisicao: DocumentosCandidatura['requisicao'] }) => {
  const cargo = item.requisicao.cargoNome ?? item.requisicao.cargo ?? 'Cargo não informado';
  const setor = item.requisicao.ccustoNome ?? 'Setor não informado';
  const filial = item.requisicao.filial == null ? '--' : String(item.requisicao.filial).padStart(2, '0');

  return `#${item.requisicao.id} - LJ ${filial} - ${setor} - ${cargo}`;
};

export const getDocumentoUrl = (id: number) => `${apiBaseUrl()}/documentos/${id}/view`;

export const getDocumentoAssinaturaUrl = (id: number) =>
  `${apiBaseUrl()}/documentos/assinaturas/documentos/${id}/view`;

export const getDocumentoAssinaturaRhUrl = (id: number) =>
  `${apiBaseUrl()}/documentos/assinaturas/rh/documentos/${id}/view`;

const apiBaseUrl = () => import.meta.env.VITE_API_URL ?? 'http://localhost:5011';
