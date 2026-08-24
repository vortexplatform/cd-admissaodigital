import { useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  UsersRound,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

type ColaboradorAdmitido = {
  id: number;
  nome: string | null;
  filial: number | null;
  filialNome: string | null;
  cargo: string | null;
  idade: number | null;
  admissao: string | null;
  horario: string | null;
  telefone: string | null;
  matricula: string | null;
};

type RelatorioResponse = {
  summary: { total: number; totalMesAtual: number };
  data: ColaboradorAdmitido[];
  page: number;
  totalPages: number;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return formatDateInput(date);
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)) : '—';

const formatValue = (value: string | number | null | undefined) => value ?? '—';

const escapeHtml = (value: string | number | null | undefined) =>
  String(formatValue(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const columns = [
  ['Filial', 'filial'],
  ['Matrícula', 'matricula'],
  ['Nome', 'nome'],
  ['Cargo', 'cargo'],
  ['Admissão', 'admissao'],
  ['Telefone', 'telefone'],
] as const;

const pdfColumns = [
  ['Matrícula', 'matricula'],
  ['Nome', 'nome'],
  ['Cargo', 'cargo'],
  ['Idade', 'idade'],
  ['Admissão', 'admissao'],
  ['Telefone', 'telefone'],
  ['Horário', 'horario'],
] as const;

export default function ColaboradoresAdmitidosPage() {
  const [dataInicio, setDataInicio] = useState(defaultStartDate);
  const [dataFim, setDataFim] = useState(() => formatDateInput(new Date()));
  const [periodo, setPeriodo] = useState(() => ({
    dataInicio: defaultStartDate(),
    dataFim: formatDateInput(new Date()),
  }));
  const [relatorio, setRelatorio] = useState<RelatorioResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    api
      .get<RelatorioResponse>('/dashboard/colaboradores-admitidos', {
        params: { dataInicio: periodo.dataInicio, dataFim: periodo.dataFim, page, limit: 20 },
      })
      .then(({ data }) => active && setRelatorio(data))
      .catch(() => active && setError('Não foi possível carregar o relatório.'))
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [periodo.dataInicio, periodo.dataFim, page]);

  const applyPeriod = () => {
    setPeriodo({ dataInicio, dataFim });
    setPage(1);
  };
  const canGoBack = page > 1;
  const canGoForward = Boolean(relatorio && page < relatorio.totalPages);

  const fetchExportRows = async () => {
    const { data } = await api.get<RelatorioResponse>('/dashboard/colaboradores-admitidos', {
      params: {
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        page: 1,
        limit: 1000,
        export: Date.now(),
      },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return data.data;
  };

  const exportPdf = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Permita pop-ups para gerar o PDF.');
      return;
    }
    setIsExporting(true);
    try {
      const rows = await fetchExportRows();
      const groupedRows = rows.reduce<Record<string, ColaboradorAdmitido[]>>((groups, row) => {
        const filial = row.filialNome ?? 'Filial não informada';
        (groups[filial] ??= []).push(row);
        return groups;
      }, {});
      const tableHeader = pdfColumns.map(([label]) => `<th>${label}</th>`).join('');
      const groupsHtml = Object.entries(groupedRows)
        .map(([filial, filialRows]) => {
          const rowsHtml = filialRows
            .map((row) => {
              const cells = pdfColumns
                .map(([, key]) => {
                  const value = key === 'admissao' ? formatDate(row.admissao) : row[key];
                  return `<td>${escapeHtml(value)}</td>`;
                })
                .join('');
              return `<tr class="data-row">${cells}</tr>`;
            })
            .join('');
          return `<tbody class="branch-group"><tr class="branch"><td colspan="${pdfColumns.length}">${escapeHtml(filial)}</td></tr>${rowsHtml}<tr class="count"><td colspan="${pdfColumns.length}">Quantidade de candidatos por filial: <strong>${filialRows.length}</strong></td></tr></tbody>`;
        })
        .join('');
      printWindow.document.write(`<!doctype html><html><head><title>Relação de Admissões</title><style>@page{size:landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111;font-size:9px}h1{text-align:center;font-size:18px;margin:0 0 3px}p{text-align:center;font-size:11px;margin:0 0 14px}table{width:100%;border-collapse:collapse;table-layout:fixed}col.matricula{width:7%}col.nome{width:24%}col.cargo{width:23%}col.idade{width:6%}col.admissao{width:11%}col.telefone{width:10%}col.horario{width:19%}thead{display:table-header-group}th,td{padding:4px 3px;text-align:left;overflow:hidden;white-space:nowrap}th{font-size:9px;border-bottom:0}.data-row td{font-size:10px}.branch-group{page-break-inside:avoid;break-inside:avoid}.branch td,.count td{background:#d9d9d9;font-weight:bold}.count td{border-top:1px solid white;border-bottom:12px solid white}tr.data-row td{border-bottom:1px solid #ddd}</style></head><body><h1>Relação de Admissões</h1><p>Período de admissão: ${escapeHtml(formatDate(periodo.dataInicio))} a ${escapeHtml(formatDate(periodo.dataFim))}</p><table><colgroup><col class="matricula"><col class="nome"><col class="cargo"><col class="idade"><col class="admissao"><col class="telefone"><col class="horario"></colgroup><thead><tr>${tableHeader}</tr></thead>${groupsHtml}</table><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script></body></html>`);
      printWindow.document.close();
    } catch {
      printWindow.close();
      setError('Não foi possível gerar o PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Relatórios"
        title="Candidatos admitidos"
        description="Acompanhe as admissões concluídas no período selecionado."
        actions={
          <>
            <button
              type="button"
              onClick={exportPdf}
              disabled={isExporting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-button transition hover:bg-muted disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-2 text-body-sm font-medium">
            Data inicial
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-body-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </span>
          </label>
          <label className="flex flex-1 flex-col gap-2 text-body-sm font-medium">
            Data final
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-body-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </span>
          </label>
          <button
            type="button"
            onClick={applyPeriod}
            className="h-10 rounded-md bg-primary px-4 text-button text-primary-foreground transition hover:bg-primary/90"
          >
            Aplicar período
          </button>
        </CardContent>
      </Card>

      {error ? <p className="mb-4 text-body-sm text-destructive">{error}</p> : null}

      <section className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <CardDescription>Admissões no período</CardDescription>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <UsersRound className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold tracking-tight">
              {isLoading ? '—' : relatorio?.summary.total ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <CardDescription>Admissões neste mês</CardDescription>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <BarChart3 className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold tracking-tight">
              {isLoading ? '—' : relatorio?.summary.totalMesAtual ?? 0}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lista de colaboradores</CardTitle>
          <CardDescription>
            {relatorio?.summary.total ?? 0} colaborador{relatorio?.summary.total === 1 ? '' : 'es'} encontrado{relatorio?.summary.total === 1 ? '' : 's'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-body-sm">
              <thead className="border-y bg-muted/40 text-caption font-medium text-muted-foreground">
                <tr>
                  {columns.map(([label]) => <th key={label} className="px-4 py-3">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={columns.length} className="px-6 py-10 text-center text-muted-foreground">Carregando colaboradores...</td></tr>
                ) : relatorio?.data.length ? (
                  relatorio.data.map((colaborador) => (
                    <tr key={colaborador.id} className="hover:bg-muted/30">
                      <td className="px-4 py-4">{formatValue(colaborador.filial)}</td>
                      <td className="px-4 py-4">{formatValue(colaborador.matricula)}</td>
                      <td className="px-4 py-4 font-medium">{colaborador.nome || 'Sem nome'}</td>
                      <td className="px-4 py-4">{formatValue(colaborador.cargo)}</td>
                      <td className="px-4 py-4">{formatDate(colaborador.admissao)}</td>
                      <td className="px-4 py-4">{formatValue(colaborador.telefone)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={columns.length} className="px-6 py-10 text-center text-muted-foreground">Nenhum colaborador admitido no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-caption text-muted-foreground">Página {page} de {relatorio?.totalPages ?? 1}</p>
            <div className="flex gap-2">
              <button type="button" aria-label="Página anterior" disabled={!canGoBack} onClick={() => setPage((value) => value - 1)} className="rounded-md border p-2 text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Próxima página" disabled={!canGoForward} onClick={() => setPage((value) => value + 1)} className="rounded-md border p-2 text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
