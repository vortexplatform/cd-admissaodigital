import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface AceiteRegistrado {
  id: number;
  versaoRegulamento: string;
  hashRegulamento: string;
  aceitoEm: string;
  codigoVerificacao: string;
  documentoAssinaturaId: number | null;
}

// Versão atual do regulamento — atualizar ao publicar nova versão
const VERSAO_REGULAMENTO = '1.0.0';

const TEXTO_REGULAMENTO = `REGULAMENTO INTERNO DA EMPRESA

1. CONDUTA E ÉTICA PROFISSIONAL
O colaborador deve manter postura profissional, ética e respeitosa com todos os colegas, clientes e fornecedores.

2. HORÁRIO DE TRABALHO
O colaborador deve cumprir o horário de trabalho conforme definido no contrato e comunicar ausências ou atrasos com antecedência.

3. USO DE EQUIPAMENTOS E RECURSOS
Os equipamentos e recursos da empresa devem ser utilizados exclusivamente para fins profissionais, zelando pela sua conservação.

4. SEGURANÇA E HIGIENE
O colaborador deve seguir todas as normas de segurança e higiene, utilizando os equipamentos de proteção individual quando necessário.

5. CONFIDENCIALIDADE
Informações confidenciais da empresa, clientes e fornecedores não devem ser divulgadas a terceiros.

6. USO DE TECNOLOGIA
O uso de dispositivos pessoais durante o expediente deve ser restrito a pausas autorizadas, salvo quando necessário para o trabalho.

7. CONFLITO DE INTERESSES
O colaborador deve comunicar ao gestor qualquer situação que possa representar conflito de interesses com as atividades da empresa.

8. PROCESSO DISCIPLINAR
O descumprimento deste regulamento poderá implicar em advertência, suspensão ou demissão por justa causa, conforme a gravidade da infração.

9. ATUALIZAÇÃO
Este regulamento pode ser atualizado pela empresa, sendo os colaboradores notificados com antecedência mínima de 30 dias.`;

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function RegulamentoPage() {
  const [aceites, setAceites] = useState<AceiteRegistrado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [lido, setLido] = useState(false);
  const [hashAtual, setHashAtual] = useState<string>('calculando…');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sha256Hex(TEXTO_REGULAMENTO).then(setHashAtual);
    carregarAceites();
  }, []);

  async function carregarAceites() {
    setCarregando(true);
    try {
      const { data } = await api.get<AceiteRegistrado[]>('/aceite-regulamento/candidato');
      setAceites(data);
    } catch {
      // lista vazia
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarAceite() {
    if (!lido) return;
    setEnviando(true);
    setMensagem(null);
    try {
      const hashRegulamento = await sha256Hex(TEXTO_REGULAMENTO);
      await api.post('/aceite-regulamento', {
        versaoRegulamento: VERSAO_REGULAMENTO,
        hashRegulamento,
      });
      setMensagem({ tipo: 'sucesso', texto: 'Aceite do Regulamento Interno registrado com sucesso!' });
      await carregarAceites();
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível registrar o aceite. Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setLido(true);
    }
  }

  const aceiteAtual = aceites.find((a) => a.versaoRegulamento === VERSAO_REGULAMENTO);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#1a1a2e' }}>
        Regulamento Interno da Empresa
      </h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
        Versão {VERSAO_REGULAMENTO} — Leia com atenção antes de confirmar o aceite.
      </p>

      {aceiteAtual && (
        <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <strong style={{ color: '#155724' }}>✅ Você já aceitou este regulamento</strong>
          <p style={{ color: '#155724', fontSize: 13, margin: '4px 0 0' }}>
            Registrado em{' '}
            {new Date(aceiteAtual.aceitoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT —
            Código: <strong>{aceiteAtual.codigoVerificacao}</strong>
          </p>
        </div>
      )}

      {/* Texto do regulamento */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 20,
          marginBottom: 12,
          maxHeight: 400,
          overflowY: 'auto',
          fontSize: 14,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          color: '#333',
        }}
      >
        {TEXTO_REGULAMENTO}
      </div>
      {!lido && (
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
          ↓ Role o texto até o final para habilitar o aceite.
        </p>
      )}

      <p style={{ fontSize: 11, color: '#aaa', marginBottom: 16 }}>
        Hash SHA-256 deste regulamento:{' '}
        <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{hashAtual}</code>
      </p>

      {!aceiteAtual && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
            <input
              type="checkbox"
              id="lido"
              checked={lido}
              onChange={(e) => setLido(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="lido" style={{ fontSize: 14, cursor: 'pointer', color: '#333', lineHeight: 1.5 }}>
              Li e compreendi na íntegra o Regulamento Interno da Empresa (versão {VERSAO_REGULAMENTO}) e concordo
              com todos os seus termos e condições.
            </label>
          </div>

          {mensagem && (
            <div
              style={{
                backgroundColor: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
                fontSize: 14,
                color: mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
              }}
            >
              {mensagem.texto}
            </div>
          )}

          <button
            onClick={confirmarAceite}
            disabled={!lido || enviando}
            style={{
              padding: '12px 24px',
              backgroundColor: lido && !enviando ? '#1a1a2e' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: lido && !enviando ? 'pointer' : 'not-allowed',
            }}
          >
            {enviando ? 'Registrando aceite…' : 'Confirmar aceite do Regulamento Interno'}
          </button>
        </>
      )}

      {/* Histórico de aceites */}
      {aceites.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' }}>
            Histórico de aceites
          </h2>
          {carregando ? (
            <p style={{ color: '#888' }}>Carregando…</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={thStyle}>Versão</th>
                  <th style={thStyle}>Data/hora (Brasília)</th>
                  <th style={thStyle}>Código de verificação</th>
                </tr>
              </thead>
              <tbody>
                {aceites.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{a.versaoRegulamento}</td>
                    <td style={tdStyle}>
                      {new Date(a.aceitoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT
                    </td>
                    <td style={tdStyle}>
                      <code>{a.codigoVerificacao}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#555',
  borderBottom: '2px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#333',
};
