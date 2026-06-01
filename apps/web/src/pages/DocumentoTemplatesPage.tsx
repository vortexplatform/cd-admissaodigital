import { useCallback, useEffect, useState } from 'react';
import { FileText, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

type ModoSubstituicaoDocumento = 'SEMPRE' | 'CAMPO_OCR';

interface DocumentoTemplateSubstituicao {
  substituidoTemplateId: number;
  modo: ModoSubstituicaoDocumento;
  campoOcr: string | null;
  substituido: { nome: string };
}

interface DocumentoTemplate {
  id: number;
  nome: string;
  descricao: string | null;
  palavrasChave: string[];
  mimeTypesPermitidos: string[];
  condicaoGenero: string | null;
  condicaoPossuiFilhos: boolean | null;
  obrigatorio: boolean;
  ordem: number;
  substitui: DocumentoTemplateSubstituicao[];
}

interface TemplateForm {
  nome: string;
  descricao: string;
  palavrasChave: string;
  mimeTypesPermitidos: string;
  condicaoGenero: '' | 'M' | 'F';
  condicaoPossuiFilhos: '' | 'true' | 'false';
  obrigatorio: boolean;
  ordem: number;
  substituicoes: Array<{
    substituidoTemplateId: number;
    modo: ModoSubstituicaoDocumento;
    campoOcr: string;
  }>;
}

const emptyForm: TemplateForm = {
  nome: '',
  descricao: '',
  palavrasChave: '',
  mimeTypesPermitidos: '',
  condicaoGenero: '',
  condicaoPossuiFilhos: '',
  obrigatorio: true,
  ordem: 0,
  substituicoes: [],
};

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (values: string[]) => values.join(', ');

export default function DocumentoTemplatesPage() {
  const { empresaAtiva } = useAuth();
  const [templates, setTemplates] = useState<DocumentoTemplate[]>([]);
  const [editing, setEditing] = useState<DocumentoTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = useCallback(async () => {
    if (!empresaAtiva) return;
    const { data } = await api.get<DocumentoTemplate[]>(
      `/empresas/${empresaAtiva.id}/documentos-template`,
    );
    setTemplates(data);
  }, [empresaAtiva]);

  useEffect(() => {
    loadTemplates()
      .catch(() => setError('Não foi possível carregar a configuração de documentos.'))
      .finally(() => setIsLoading(false));
  }, [loadTemplates]);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, ordem: templates.length });
  };

  const startEdit = (template: DocumentoTemplate) => {
    setEditing(template);
    setForm({
      nome: template.nome,
      descricao: template.descricao ?? '',
      palavrasChave: joinList(template.palavrasChave),
      mimeTypesPermitidos: joinList(template.mimeTypesPermitidos),
      condicaoGenero: (template.condicaoGenero as 'M' | 'F' | null) ?? '',
      condicaoPossuiFilhos:
        template.condicaoPossuiFilhos === null ? '' : String(template.condicaoPossuiFilhos) as 'true' | 'false',
      obrigatorio: template.obrigatorio,
      ordem: template.ordem,
      substituicoes: template.substitui.map((item) => ({
        substituidoTemplateId: item.substituidoTemplateId,
        modo: item.modo,
        campoOcr: item.campoOcr ?? '',
      })),
    });
  };

  const save = async () => {
    if (!empresaAtiva || !form.nome.trim()) return;

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || undefined,
      palavrasChave: splitList(form.palavrasChave),
      mimeTypesPermitidos: splitList(form.mimeTypesPermitidos),
      condicaoGenero: form.condicaoGenero || undefined,
      condicaoPossuiFilhos:
        form.condicaoPossuiFilhos === '' ? null : form.condicaoPossuiFilhos === 'true',
      obrigatorio: form.obrigatorio,
      ordem: form.ordem,
      substituicoes: form.substituicoes.map((item) => ({
        ...item,
        campoOcr: item.modo === 'CAMPO_OCR' ? item.campoOcr || 'cpf' : undefined,
      })),
    };

    setIsSaving(true);
    setError('');
    try {
      if (editing) {
        await api.patch(`/empresas/${empresaAtiva.id}/documentos-template/${editing.id}`, payload);
      } else {
        await api.post(`/empresas/${empresaAtiva.id}/documentos-template`, payload);
      }
      await loadTemplates();
      setEditing(null);
      setForm(emptyForm);
    } catch {
      setError('Não foi possível salvar o documento.');
    } finally {
      setIsSaving(false);
    }
  };

  const seedDefaults = async () => {
    if (!empresaAtiva) return;
    setIsSaving(true);
    setError('');
    try {
      const { data } = await api.post<DocumentoTemplate[]>(
        `/empresas/${empresaAtiva.id}/documentos-template/seed`,
      );
      setTemplates(data);
    } catch {
      setError('Não foi possível carregar os padrões CLT.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (template: DocumentoTemplate) => {
    if (!empresaAtiva) return;
    const confirmed = window.confirm(`Excluir o documento "${template.nome}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/empresas/${empresaAtiva.id}/documentos-template/${template.id}`);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch {
      setError('Não foi possível excluir. Verifique se o documento já está em uso.');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Regras de documentos"
        description="Defina quais documentos serão gerados para o candidato, condições de aplicação e substituições."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={seedDefaults} disabled={isSaving}>
              <Sparkles className="h-4 w-4" />
              Usar padrões CLT
            </Button>
            <Button type="button" onClick={startCreate}>
              <Plus className="h-4 w-4" />
              Novo documento
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_28rem]">
        <Card className="shadow-corporate">
          <CardHeader>
            <CardTitle>Documentos configurados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum documento configurado. Use os padrões CLT ou crie manualmente.
              </div>
            ) : (
              templates.map((template) => (
                <article key={template.id} className="rounded-2xl border bg-background/80 p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{template.nome}</h2>
                        {!template.obrigatorio && (
                          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            Opcional
                          </span>
                        )}
                        {template.condicaoGenero && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            Gênero {template.condicaoGenero}
                          </span>
                        )}
                        {template.condicaoPossuiFilhos && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Filhos</span>
                        )}
                      </div>
                      {template.descricao && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {template.descricao}
                        </p>
                      )}
                      {template.substitui.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Substitui:{' '}
                          {template.substitui.map((item) => item.substituido.nome).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="icon" onClick={() => startEdit(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => remove(template)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-corporate">
          <CardHeader>
            <CardTitle>{editing ? 'Editar documento' : 'Novo documento'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome">
              <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
            </Field>
            <Field label="Instrução para o candidato">
              <textarea
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.descricao}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              />
            </Field>
            <Field label="Palavras-chave OCR">
              <Input
                placeholder="Separadas por vírgula"
                value={form.palavrasChave}
                onChange={(event) => setForm({ ...form, palavrasChave: event.target.value })}
              />
            </Field>
            <Field label="Tipos MIME permitidos">
              <Input
                placeholder="application/pdf, image/jpeg"
                value={form.mimeTypesPermitidos}
                onChange={(event) => setForm({ ...form, mimeTypesPermitidos: event.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Condição de gênero">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.condicaoGenero}
                  onChange={(event) =>
                    setForm({ ...form, condicaoGenero: event.target.value as TemplateForm['condicaoGenero'] })
                  }
                >
                  <option value="">Todos</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </Field>
              <Field label="Condição de filhos">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.condicaoPossuiFilhos}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      condicaoPossuiFilhos: event.target.value as TemplateForm['condicaoPossuiFilhos'],
                    })
                  }
                >
                  <option value="">Todos</option>
                  <option value="true">Apenas se tiver filhos</option>
                  <option value="false">Apenas se não tiver filhos</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.obrigatorio}
                onChange={(event) => setForm({ ...form, obrigatorio: event.target.checked })}
              />
              Documento obrigatório
            </label>
            <SubstitutionEditor
              currentId={editing?.id ?? null}
              form={form}
              templates={templates}
              onChange={(substituicoes) => setForm({ ...form, substituicoes })}
            />
            <Button type="button" className="w-full" disabled={isSaving || !form.nome.trim()} onClick={save}>
              {isSaving ? 'Salvando...' : 'Salvar documento'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SubstitutionEditor({
  currentId,
  form,
  onChange,
  templates,
}: {
  currentId: number | null;
  form: TemplateForm;
  onChange: (value: TemplateForm['substituicoes']) => void;
  templates: DocumentoTemplate[];
}) {
  const availableTemplates = templates.filter((template) => template.id !== currentId);

  const toggle = (templateId: number) => {
    const exists = form.substituicoes.some((item) => item.substituidoTemplateId === templateId);
    if (exists) {
      onChange(form.substituicoes.filter((item) => item.substituidoTemplateId !== templateId));
      return;
    }
    onChange([
      ...form.substituicoes,
      { substituidoTemplateId: templateId, modo: 'SEMPRE', campoOcr: '' },
    ]);
  };

  const updateMode = (templateId: number, modo: ModoSubstituicaoDocumento) => {
    onChange(
      form.substituicoes.map((item) =>
        item.substituidoTemplateId === templateId
          ? { ...item, modo, campoOcr: modo === 'CAMPO_OCR' ? item.campoOcr || 'cpf' : '' }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-2">
      <Label>Substitui outros documentos</Label>
      <div className="space-y-2 rounded-2xl border p-3">
        {availableTemplates.length === 0 ? (
          <p className="text-xs text-muted-foreground">Crie outros documentos para configurar substituições.</p>
        ) : (
          availableTemplates.map((template) => {
            const selected = form.substituicoes.find(
              (item) => item.substituidoTemplateId === template.id,
            );
            return (
              <div key={template.id} className="rounded-xl border bg-background p-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(selected)} onChange={() => toggle(template.id)} />
                  {template.nome}
                </label>
                {selected && (
                  <select
                    className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs"
                    value={selected.modo}
                    onChange={(event) =>
                      updateMode(template.id, event.target.value as ModoSubstituicaoDocumento)
                    }
                  >
                    <option value="SEMPRE">Sempre dispensa</option>
                    <option value="CAMPO_OCR">Só se OCR detectar CPF</option>
                  </select>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
