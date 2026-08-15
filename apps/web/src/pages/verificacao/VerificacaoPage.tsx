import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || '/api';

interface ResultadoVerificacao {
  autenticidade: string;
  codigoVerificacao: string;
  nomeDocumento: string;
  statusDocumento: string;
  integridade: {
    status: 'INTEGRO' | 'PARCIAL';
    descricao: string;
  };
  colaborador: {
    nome: string;
    cpfMascarado: string | null;
    metodoAssinatura: string | null;
    assinadoEm: string | null;
    assinadoEmBrasilia: string | null;
    ip: string | null;
  };
  empresa: {
    nome: string | null;
    cnpj: string | null;
    metodo: string;
    certificadoSubject: string | null;
    emissor: string | null;
    serial: string | null;
    certValidoDe: string | null;
    certValidoAte: string | null;
    assinouEm: string;
    assinouEmBrasilia: string;
    responsavel: {
      nome: string | null;
      cargo: string | null;
      email: string | null;
      ip: string | null;
      userAgent: string | null;
    };
  } | null;
  hashes: {
    original: string;
    aposAssinaturaColaborador: string | null;
    documentoPrecertificacao: string | null;
  };
}

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pendente de assinatura',
  ASSINADO: 'Assinado',
  CANCELADO: 'Cancelado',
};

const metodoLabel: Record<string, string> = {
  OTP: 'Assinatura eletrônica avançada por OTP',
  BIOMETRIA: 'Assinatura biométrica assistida',
};

export default function VerificacaoPage() {
  const { codigo: codigoParam } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState(codigoParam ?? '');
  const [resultado, setResultado] = useState<ResultadoVerificacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function verificar(codigoAVerificar: string) {
    const codigoLimpo = codigoAVerificar.trim().toUpperCase();
    if (!codigoLimpo) return;

    setCarregando(true);
    setErro(null);
    setResultado(null);

    try {
      const { data } = await axios.get<ResultadoVerificacao>(`${apiUrl}/verificar/${codigoLimpo}`);
      setResultado(data);
      if (codigoParam !== codigoLimpo) {
        navigate(`/verificar/${codigoLimpo}`, { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setErro('Código de verificação não encontrado. Verifique se o código foi digitado corretamente.');
      } else {
        setErro('Não foi possível verificar o documento. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (codigoParam) {
      void verificar(codigoParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoParam]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ backgroundColor: '#f5dc00', borderRadius: 4, padding: '4px 8px' }}>
          <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: 14 }}>CD Coelho Diniz</span>
        </div>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Verificação de Documento</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        {/* Input de código */}
        <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>
            Verificar Autenticidade do Documento
          </h1>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 20 }}>
            Informe o código de verificação (ex: <strong>AD-A1B2C3D4</strong>) para confirmar a autenticidade e integridade do documento assinado.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && verificar(codigo)}
              placeholder="AD-XXXXXXXX"
              style={{
                flex: 1, padding: '10px 14px', border: '1px solid #ccc', borderRadius: 6,
                fontSize: 15, fontFamily: 'monospace', letterSpacing: 1, color: '#111',
              }}
            />
            <button
              onClick={() => verificar(codigo)}
              disabled={carregando || !codigo.trim()}
              style={{
                padding: '10px 20px', backgroundColor: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
                cursor: carregando ? 'wait' : 'pointer',
                opacity: carregando || !codigo.trim() ? 0.6 : 1,
              }}
            >
              {carregando ? 'Verificando…' : 'Verificar'}
            </button>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ backgroundColor: '#fff3f3', border: '1px solid #f5c6cb', borderRadius: 8, padding: 16, color: '#721c24', marginBottom: 24 }}>
            <strong>Não encontrado</strong>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{erro}</p>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div>
            {/* Badge de autenticidade */}
            <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: '#155724', fontSize: 15 }}>Documento Autêntico</div>
                <div style={{ color: '#155724', fontSize: 13 }}>{resultado.autenticidade}</div>
              </div>
            </div>

            {/* Integridade */}
            <div style={{
              backgroundColor: resultado.integridade.status === 'INTEGRO' ? '#d4edda' : '#fff3cd',
              border: `1px solid ${resultado.integridade.status === 'INTEGRO' ? '#c3e6cb' : '#ffeeba'}`,
              borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            }}>
              <span style={{ fontSize: 18 }}>{resultado.integridade.status === 'INTEGRO' ? '🔒' : '⚠️'}</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: resultado.integridade.status === 'INTEGRO' ? '#155724' : '#856404' }}>
                  {resultado.integridade.status === 'INTEGRO' ? 'Documento íntegro / Hash confere' : 'Assinatura parcial'}
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>{resultado.integridade.descricao}</p>
              </div>
            </div>

            {/* Informações do documento */}
            <Section titulo="Informações do Documento">
              <Row label="Documento" value={resultado.nomeDocumento} />
              <Row label="Código de verificação" value={resultado.codigoVerificacao} mono />
              <Row label="Status" value={statusLabel[resultado.statusDocumento] ?? resultado.statusDocumento} />
            </Section>

            {/* Assinatura do colaborador */}
            <Section titulo="Assinatura do Colaborador">
              <Row label="Assinado por" value={resultado.colaborador.nome} />
              {resultado.colaborador.cpfMascarado && (
                <Row label="CPF (mascarado)" value={resultado.colaborador.cpfMascarado} mono />
              )}
              <Row label="Método" value={resultado.colaborador.metodoAssinatura ? (metodoLabel[resultado.colaborador.metodoAssinatura] ?? resultado.colaborador.metodoAssinatura) : 'Não informado'} />
              {resultado.colaborador.assinadoEmBrasilia && (
                <Row label="Data/hora (Brasília)" value={resultado.colaborador.assinadoEmBrasilia} />
              )}
              {resultado.colaborador.assinadoEm && (
                <Row label="Data/hora (UTC)" value={resultado.colaborador.assinadoEm} mono />
              )}
              {resultado.colaborador.ip && (
                <Row label="IP do assinante" value={resultado.colaborador.ip} mono />
              )}
            </Section>

            {/* Assinatura da empresa */}
            {resultado.empresa && (
              <>
                <Section titulo="Empresa">
                  {resultado.empresa.nome && <Row label="Razão social" value={resultado.empresa.nome} />}
                  {resultado.empresa.cnpj && <Row label="CNPJ" value={resultado.empresa.cnpj} mono />}
                  <Row label="Método" value={resultado.empresa.metodo} />
                  {resultado.empresa.certificadoSubject && (
                    <Row label="Subject do certificado" value={resultado.empresa.certificadoSubject} mono small />
                  )}
                  {resultado.empresa.emissor && (
                    <Row label="Emissor" value={resultado.empresa.emissor} small />
                  )}
                  {resultado.empresa.serial && (
                    <Row label="Número de série" value={resultado.empresa.serial} mono small />
                  )}
                  {resultado.empresa.certValidoDe && (
                    <Row label="Certificado válido de" value={new Date(resultado.empresa.certValidoDe).toLocaleDateString('pt-BR')} />
                  )}
                  {resultado.empresa.certValidoAte && (
                    <Row label="Certificado válido até" value={new Date(resultado.empresa.certValidoAte).toLocaleDateString('pt-BR')} />
                  )}
                  <Row label="Data/hora assinatura (Brasília)" value={resultado.empresa.assinouEmBrasilia} />
                  <Row label="Data/hora assinatura (UTC)" value={resultado.empresa.assinouEm} mono />
                </Section>

              </>
            )}

            {/* Hashes de integridade */}
            <Section titulo="Integridade do Documento (SHA-256)">
              <Row label="Hash original" value={resultado.hashes.original} mono small />
              {resultado.hashes.aposAssinaturaColaborador && (
                <Row label="Hash após assinatura do colaborador" value={resultado.hashes.aposAssinaturaColaborador} mono small />
              )}
              {resultado.hashes.documentoPrecertificacao && (
                <Row label="Hash do documento (pré-carimbo ICP-Brasil)" value={resultado.hashes.documentoPrecertificacao} mono small />
              )}
            </Section>

            <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 16 }}>
              Verificação realizada em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT pelo sistema Admissão Digital.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
        {titulo}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 8, alignItems: 'start' }}>
      <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{label}:</span>
      <span style={{ fontSize: small ? 11 : 13, fontFamily: mono ? 'monospace' : 'inherit', color: '#222', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}
