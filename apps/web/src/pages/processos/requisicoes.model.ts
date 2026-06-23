export const tipos = [
  'NOVA_VAGA',
  'SUBSTITUICAO',
  'AUMENTO_QUADRO',
  'TEMPORARIA',
  'OUTRO',
] as const;

export const statusList = [
  'RASCUNHO',
  'ABERTA',
  'AGUARDANDO_CANDIDATO',
  'EM_ADMISSAO',
  'AGUARDANDO_DOCUMENTOS',
  'AGUARDANDO_ASSINATURA',
  'AGUARDANDO_RH',
  'PENDENTE_CORRECAO',
  'APROVADA',
  'INTEGRANDO_SENIOR',
  'INTEGRADA_SENIOR',
  'CANCELADA',
  'REPROVADA',
  'ERRO_INTEGRACAO',
] as const;

export const statusCandidaturaList = [
  'INSCRITO',
  'EM_ANALISE',
  'ENTREVISTA',
  'APROVADO',
  'EFETIVADO',
  'REPROVADO',
  'DESISTIU',
  'CANCELADO',
] as const;

export type TipoRequisicao = (typeof tipos)[number];
export type StatusRequisicao = (typeof statusList)[number];
export type StatusCandidatura = (typeof statusCandidaturaList)[number];

export interface Empresa {
  id: number;
  nome: string;
  codigoEmpresaSenior: string;
}

export interface Candidato {
  id: number;
  nome: string | null;
  cpf: string;
}

export interface Candidatura {
  id: number;
  status: StatusCandidatura;
  candidato: Candidato;
}

export interface Requisicao {
  id: number;
  tipo: TipoRequisicao;
  status: StatusRequisicao;
  quantidadeVagas: number;
  empresaId: number | null;
  empresa: Empresa | null;
  candidaturas: Candidatura[];
  filial: number | null;
  filialNome: string | null;
  postoTrabalho: string | null;
  postoTrabalhoNome: string | null;
  cargo: string | null;
  cargoNome: string | null;
  centroCusto: string | null;
  ccustoNome: string | null;
  escala: string | null;
  descricaoEscala: string | null;
  sindicato: string | null;
  dataPrevistaAdmissao: string | null;
  motivoAbertura: string | null;
  observacao: string | null;
  codigoRequisicaoSenior: string | null;
  codigoCandidatoSenior: string | null;
  codigoColaboradorSenior: string | null;
  createdAt: string;
}

export const labels: Record<string, string> = {
  NOVA_VAGA: 'Nova vaga',
  SUBSTITUICAO: 'Substituição',
  AUMENTO_QUADRO: 'Aumento de quadro',
  TEMPORARIA: 'Temporária',
  OUTRO: 'Outro',
  RASCUNHO: 'Rascunho',
  ABERTA: 'Aberta',
  AGUARDANDO_CANDIDATO: 'Aguardando candidato',
  EM_ADMISSAO: 'Em admissão',
  AGUARDANDO_DOCUMENTOS: 'Aguardando documentos',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  AGUARDANDO_RH: 'Aguardando RH',
  PENDENTE_CORRECAO: 'Pendente correção',
  APROVADA: 'Aprovada',
  INTEGRANDO_SENIOR: 'Integrando Senior',
  INTEGRADA_SENIOR: 'Integrada Senior',
  CANCELADA: 'Cancelada',
  REPROVADA: 'Reprovada',
  ERRO_INTEGRACAO: 'Erro integração',
  INSCRITO: 'Inscrito',
  EM_ANALISE: 'Em análise',
  ENTREVISTA: 'Entrevista',
  APROVADO: 'Aprovado',
  EFETIVADO: 'Efetivado',
  REPROVADO: 'Reprovado',
  DESISTIU: 'Desistiu',
  CANCELADO: 'Cancelado',
};

export const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : '');

export const toText = (value: string | number | null | undefined) =>
  value == null ? '' : String(value);

export const optionalString = (value?: string) => value?.trim() || undefined;

export const optionalNumber = (value?: string) => {
  const text = value?.trim();
  return text ? Number(text) : undefined;
};

export const formatCpf = (value: string) =>
  value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
