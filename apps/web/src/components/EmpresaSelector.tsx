import { Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function EmpresaSelector() {
  const { empresas, empresaAtiva, selectEmpresa } = useAuth();

  if (empresas.length > 1) {
    return (
      <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-body-sm">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="sr-only">Selecionar empresa ativa</span>
        <div>
          <p className="font-medium leading-none">Ambiente RH</p>
          <select
            value={empresaAtiva?.id ?? ''}
            onChange={(event) => selectEmpresa(Number(event.target.value))}
            className="mt-1 max-w-[220px] bg-transparent text-caption text-muted-foreground outline-none"
          >
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>
      </label>
    );
  }

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-body-sm">
      <p className="font-medium leading-none">Ambiente RH</p>
      <p className="mt-1 max-w-[220px] truncate text-caption text-muted-foreground">
        {empresaAtiva?.nome ?? 'Nenhuma empresa vinculada'}
      </p>
    </div>
  );
}
