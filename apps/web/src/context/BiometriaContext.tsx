import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '@/lib/api';

export type Idface = { codplt: number; codrlg: number; desrlg: string; coddsp: number; ip: string };

type BiometriaContextType = {
  dispositivos: Idface[];
  dispositivoAtivo: Idface | null;
  isLoading: boolean;
  selectDispositivo: (ip: string) => void;
};

const COOKIE = 'biometria_dispositivo_ativo_id';
const BiometriaContext = createContext<BiometriaContextType | null>(null);

const readCookie = () => {
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${COOKIE}=`))?.split('=')[1];
  return value ? decodeURIComponent(value) : null;
};

export function BiometriaProvider({ children }: { children: ReactNode }) {
  const [dispositivos, setDispositivos] = useState<Idface[]>([]);
  const [dispositivoAtivo, setDispositivoAtivo] = useState<Idface | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<Idface[]>('/biometria/idfaces').then(({ data }) => {
      setDispositivos(data);
      setDispositivoAtivo(data.find((dispositivo) => dispositivo.ip === readCookie()) ?? null);
    }).catch(() => {
      setDispositivos([]);
      setDispositivoAtivo(null);
    }).finally(() => setIsLoading(false));
  }, []);

  const selectDispositivo = (ip: string) => {
    const dispositivo = dispositivos.find((item) => item.ip === ip) ?? null;
    setDispositivoAtivo(dispositivo);
    if (dispositivo) document.cookie = `${COOKIE}=${dispositivo.ip}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return <BiometriaContext.Provider value={{ dispositivos, dispositivoAtivo, isLoading, selectDispositivo }}>{children}</BiometriaContext.Provider>;
}

export function useBiometria() {
  const context = useContext(BiometriaContext);
  if (!context) throw new Error('useBiometria deve ser usado dentro de BiometriaProvider.');
  return context;
}
