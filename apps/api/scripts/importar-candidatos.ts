import { createReadStream, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'csv-parse';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 1000;
const DEFAULT_CIDADE_VAGA_ID = 1;
const DEFAULT_BIRTH_DATE = new Date(Date.UTC(1900, 11, 31));

const expectedHeader = [
  'NUMCAN', 'NOMCAN', 'NOMSOC', 'ESTCIV', 'DATNAS', 'TIPSEX', 'USU_TAMCAM',
  'USU_TAMCAL', 'USU_TAMSAP', 'NOMCOM', 'ESTCIV', 'GRAINS', 'SITCEX', 'CODPAI',
  'CODEST', 'CODCID', 'NOMCID', 'CODBAI', 'NOMBAI', 'DATADM', 'DATINC', 'NUMCTP',
  'SERCTP', 'ESTCTP', 'DATCTP', 'CODCEP', 'NUMEMP', 'TIPCOL', 'NUMCAD', 'PAINAS',
  'ESTNAS', 'CIDNAS', 'NOMCID', 'CPFCAN', 'PISCAN', 'IDECAN', 'TIPLGR', 'ENDCAN',
  'ENDNUM', 'ENDCPL', 'NOMBAI', 'NUMELE', 'ZONELE', 'SECELE', 'NUMRES', 'CATRES',
  'EMICID', 'ESTCID', 'DEXCID', 'DEFFIS', 'CODDEF', 'OBSCAN',
];

type SourceRow = string[];

const value = (row: SourceRow, index: number) => row[index]?.trim() || undefined;
const digits = (input?: string) => input?.replace(/\D/g, '') || undefined;
const normalizeCpf = (input?: string) => {
  const cpf = digits(input);
  if (!cpf || cpf.length > 11) return undefined;
  return cpf.padStart(11, '0');
};
const integer = (input?: string) => (input && /^\d+$/.test(input) ? Number(input) : undefined);

const parseDate = (input?: string) => {
  if (!input) return undefined;
  const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCDate() === Number(day) && date.getUTCMonth() === Number(month) - 1
    ? date
    : undefined;
};

const parseBirthDate = (input?: string) => {
  if (!input || /^0{2}\/0{2}\/0{4}$/.test(input)) return DEFAULT_BIRTH_DATE;
  return parseDate(input);
};

const isValidCpf = (cpf?: string) => Boolean(cpf && /^\d{11}$/.test(cpf));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--arquivo');
  const cidadeIndex = args.indexOf('--cidade-vaga-id');
  const dryRun = args.includes('--dry-run');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
  const cidadeVagaId = cidadeIndex >= 0 ? Number(args[cidadeIndex + 1]) : DEFAULT_CIDADE_VAGA_ID;
  if (!file || !existsSync(file) || !Number.isInteger(cidadeVagaId) || cidadeVagaId < 1) {
    throw new Error('Uso: --arquivo caminho.csv [--cidade-vaga-id 1] [--dry-run]');
  }
  return { file, cidadeVagaId, dryRun };
};

const buildCandidate = (row: SourceRow, cidadeVagaId: number) => {
  const cpf = normalizeCpf(value(row, 33));
  const dataNascimento = parseBirthDate(value(row, 4));
  const nome = value(row, 1);
  if (!cpf || !isValidCpf(cpf)) return { error: 'CPF inválido ou ausente' };
  if (!dataNascimento) return { error: 'DATNAS inválida ou ausente' };
  if (!nome) return { error: 'NOMCAN ausente' };

  return {
    data: {
      cpf,
      dataNascimento,
      nome,
      nomeSocial: value(row, 2)?.slice(0, 70),
      genero: value(row, 5),
      estadoCivil: value(row, 3),
      grauInstrucao: value(row, 11),
      pis: digits(value(row, 34)),
      cidadeVagaId,
      cep: digits(value(row, 25)),
      estadoEndereco: value(row, 14),
      cidadeCod: integer(value(row, 15)),
      cidadeNome: value(row, 16),
      bairroCod: integer(value(row, 17)),
      bairroNome: value(row, 18),
      tipoLogradouro: value(row, 36),
      endereco: value(row, 37),
      numero: value(row, 38),
      complemento: value(row, 39),
      paisNascimento: value(row, 29),
      estadoNascimento: value(row, 30),
      cidadeNascimentoCod: integer(value(row, 31)),
      cidadeNascimentoNome: value(row, 32),
      numeroTituloEleitor: digits(value(row, 41)),
      zonaTituloEleitor: value(row, 42),
      secaoTituloEleitor: value(row, 43),
      numeroCertReservista: digits(value(row, 44)),
      orgaoEmissorRg: value(row, 46),
      estadoCertidaoCivil: value(row, 47),
      dataExpedicaoRg: parseDate(value(row, 48)),
      tamanhoCamisa: value(row, 6),
      tamanhoCalca: value(row, 7),
      tamanhoCalcado: value(row, 8),
      deficiente: value(row, 49) === 'S',
    },
  };
};

const main = async () => {
  const { file, cidadeVagaId, dryRun } = parseArgs();
  if (!(await prisma.cidadeVaga.findUnique({ where: { id: cidadeVagaId }, select: { id: true } }))) {
    throw new Error(`cidade_vaga ${cidadeVagaId} não existe`);
  }

  const candidates: Prisma.CandidatoCreateManyInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let line = 1;

  const parser = createReadStream(file).pipe(parse({ delimiter: ';', relax_quotes: true, bom: true }));
  for await (const row of parser as AsyncIterable<SourceRow>) {
    if (line === 1) {
      if (row.length !== expectedHeader.length || row.some((column, index) => column !== expectedHeader[index])) {
        throw new Error('Cabeçalho incompatível com o modelo de CSV fornecido');
      }
      line += 1;
      continue;
    }
    const result = buildCandidate(row, cidadeVagaId);
    if ('error' in result) errors.push(`${line};${result.error}`);
    else if (seen.has(result.data.cpf)) errors.push(`${line};CPF duplicado no arquivo`);
    else {
      seen.add(result.data.cpf);
      candidates.push(result.data);
    }
    line += 1;
  }

  let inserted = 0;
  if (!dryRun) {
    for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
      const result = await prisma.candidato.createMany({
        data: candidates.slice(index, index + BATCH_SIZE),
        skipDuplicates: true,
      });
      inserted += result.count;
    }
  }

  console.log(JSON.stringify({ arquivo: basename(file), linhas: line - 1, validos: candidates.length, inseridos: inserted, ignorados: candidates.length - inserted, erros: errors.length, dryRun }, null, 2));
  if (errors.length) console.log(errors.join('\n'));
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
