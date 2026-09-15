import { createReadStream, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'csv-parse';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 1000;
const expectedHeader = ['CPFCAN', 'CODETA', 'DESETA', 'USU_DATETA', 'USU_SEQETA', 'USU_COMETP'];

type SourceRow = string[];
type StageData = Omit<Prisma.CandidatoEtapaCreateManyInput, 'candidatoId'>;

const value = (row: SourceRow, index: number) => row[index]?.trim() || undefined;
const digits = (input?: string) => input?.replace(/\D/g, '') || undefined;
const normalizeCpf = (input?: string) => {
  const cpf = digits(input);
  if (!cpf || cpf.length > 11) return undefined;
  return cpf.padStart(11, '0');
};

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

const parseArgs = () => {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--arquivo');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
  const dryRun = args.includes('--dry-run');
  if (!file || !existsSync(file)) {
    throw new Error('Uso: --arquivo caminho.csv [--dry-run]');
  }
  return { file, dryRun };
};

const buildStage = (row: SourceRow) => {
  const cpf = normalizeCpf(value(row, 0));
  const codigoEtapa = Number(value(row, 1));
  const descricaoEtapa = value(row, 2);
  const data = parseDate(value(row, 3));
  const sequencia = Number(value(row, 4));

  if (!cpf) return { error: 'CPF inválido ou ausente' };
  if (!Number.isInteger(codigoEtapa) || codigoEtapa < 1) return { error: 'CODETA inválido' };
  if (!descricaoEtapa) return { error: 'DESETA ausente' };
  if (value(row, 3) && !data) return { error: 'USU_DATETA inválida' };
  if (!Number.isInteger(sequencia) || sequencia < 0) return { error: 'USU_SEQETA inválido' };

  return {
    cpf,
    stage: {
      codigoEtapa,
      descricaoEtapa,
      data,
      sequencia,
      observacao: value(row, 5),
    },
  };
};

const main = async () => {
  const { file, dryRun } = parseArgs();
  const stages: Array<{
    cpf: string;
    stage: StageData;
  }> = [];
  const errors: string[] = [];
  let line = 1;
  const parser = createReadStream(file).pipe(parse({ delimiter: ';', relax_quotes: true, bom: true }));

  for await (const row of parser as AsyncIterable<SourceRow>) {
    if (line === 1) {
      if (row.length !== expectedHeader.length || row.some((column, index) => column !== expectedHeader[index])) {
        throw new Error('Cabeçalho incompatível com o modelo de etapas');
      }
      line += 1;
      continue;
    }
    const result = buildStage(row);
    if ('error' in result) errors.push(`${line};${result.error}`);
    else stages.push(result);
    line += 1;
  }

  let inserted = 0;
  let candidatesNotFound = 0;
  for (let index = 0; index < stages.length; index += BATCH_SIZE) {
    const batch = stages.slice(index, index + BATCH_SIZE);
    const candidates = await prisma.candidato.findMany({
      where: { cpf: { in: batch.map(({ cpf }) => cpf) } },
      select: { id: true, cpf: true },
    });
    const candidateIds = new Map(candidates.map((candidate) => [candidate.cpf, candidate.id]));
    const data = batch.flatMap(({ cpf, stage }) => {
      const candidatoId = candidateIds.get(cpf);
      if (!candidatoId) {
        candidatesNotFound += 1;
        return [];
      }
      return [{ ...stage, candidatoId }];
    });
    if (!dryRun && data.length) {
      const result = await prisma.candidatoEtapa.createMany({ data, skipDuplicates: true });
      inserted += result.count;
    }
  }

  console.log(JSON.stringify({
    arquivo: basename(file),
    linhas: line - 1,
    validos: stages.length,
    inseridos: inserted,
    ignorados: dryRun ? 0 : stages.length - inserted - candidatesNotFound,
    candidatosNaoEncontrados: candidatesNotFound,
    erros: errors.length,
    dryRun,
  }, null, 2));
  if (errors.length) console.log(errors.join('\n'));
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
