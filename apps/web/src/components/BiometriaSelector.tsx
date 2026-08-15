import Select, { components, type OptionProps, type SingleValue } from 'react-select';
import { useBiometria, type Idface } from '@/context/BiometriaContext';

type IdfaceOption = { value: string; label: string; dispositivo: Idface };

const IdfaceOptionItem = (props: OptionProps<IdfaceOption, false>) => (
  <components.Option {...props}>
    <p className="text-sm font-medium text-ink">{props.data.dispositivo.desrlg}</p>
    <p className="mt-1 text-xs text-ink-muted">{props.data.dispositivo.ip}</p>
  </components.Option>
);

const IdfaceValue = ({ data }: { data: IdfaceOption }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-medium leading-tight text-ink">{data.dispositivo.desrlg}</p>
    <p className="mt-1 text-xs leading-tight text-ink-muted">{data.dispositivo.ip}</p>
  </div>
);

export default function BiometriaSelector() {
  const { dispositivos, dispositivoAtivo, isLoading, selectDispositivo } = useBiometria();
  const options = dispositivos.map((dispositivo) => ({
    value: dispositivo.ip,
    label: dispositivo.desrlg,
    dispositivo,
  }));
  const selected = options.find((option) => option.value === dispositivoAtivo?.ip) ?? null;

  return (
    <Select<IdfaceOption, false>
      aria-label="Selecionar iDFace ativo"
      className="w-[320px]"
      classNamePrefix="idface-select"
      components={{ Option: IdfaceOptionItem, SingleValue: IdfaceValue }}
      isDisabled={isLoading || options.length === 0}
      isLoading={isLoading}
      isSearchable={false}
      noOptionsMessage={() => 'Nenhum iDFace disponível'}
      options={options}
      placeholder="Selecionar iDFace"
      value={selected}
      onChange={(option: SingleValue<IdfaceOption>) => option && selectDispositivo(option.value)}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: 'unset',
          padding: 0,
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.375rem',
          backgroundColor: 'hsl(var(--card))',
          boxShadow: 'none',
          cursor: 'pointer',
          alignItems: 'center',
          '&:hover': { borderColor: 'hsl(var(--border))' },
        }),
        valueContainer: () => ({
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          flexWrap: 'nowrap' as const,
          flex: 1,
          overflow: 'hidden',
          position: 'relative' as const,
        }),
        singleValue: () => ({
          position: 'static' as const,
          top: 'auto',
          transform: 'none',
          maxWidth: '100%',
          margin: 0,
          overflow: 'hidden',
        }),
        input: (base) => ({ ...base, position: 'absolute' as const, visibility: 'hidden' as const, padding: 0, margin: 0 }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base) => ({ ...base, padding: '0 10px', color: '#626260', alignSelf: 'center' }),
        menu: (base) => ({ ...base, zIndex: 60, minWidth: 280, marginTop: 8 }),
        option: (base, state) => ({
          ...base,
          padding: '10px 12px',
          background: state.isSelected ? '#ebe7e1' : state.isFocused ? '#f5f1ec' : '#ffffff',
          color: '#111111',
          cursor: 'pointer',
        }),
        placeholder: (base) => ({ ...base, margin: 0 }),
      }}
    />
  );
}
