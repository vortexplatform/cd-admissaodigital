/**
 * Retorna true se o IP pertence a um range privado/loopback (RFC1918, loopback, IPv6 local).
 * Esses IPs não devem ser usados como evidência de localização do usuário.
 */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  // IPv6 loopback e link-local
  if (ip === '::1' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;

  // Extrair IPv4 de notação IPv4-mapeada em IPv6 (::ffff:x.x.x.x)
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const addr = ipv4Mapped ? ipv4Mapped[1] : ip;

  const parts = addr.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;

  const [a, b] = parts;
  // 127.x.x.x — loopback
  if (a === 127) return true;
  // 10.x.x.x — RFC1918
  if (a === 10) return true;
  // 172.16.x.x – 172.31.x.x — RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.x.x — RFC1918
  if (a === 192 && b === 168) return true;
  // 169.254.x.x — APIPA / link-local
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Extrai o IP público real do cliente a partir dos headers da requisição,
 * respeitando a seguinte ordem de prioridade:
 *   1. CF-Connecting-IP (Cloudflare — IP direto do cliente)
 *   2. X-Forwarded-For — primeiro IP público da lista
 *   3. X-Real-IP
 *   4. req.ip (resolvido pelo Express com trust proxy ativo)
 *   5. req.socket.remoteAddress
 *
 * IPs privados/loopback são ignorados em favor do próximo candidato.
 */
export function extractPublicIp(req: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string | undefined {
  const headers = req.headers;

  // 1. Cloudflare
  const cf = headers['cf-connecting-ip'];
  if (cf && typeof cf === 'string' && !isPrivateIp(cf)) return cf;

  // 2. X-Forwarded-For — pode ser lista separada por vírgula
  const xff = headers['x-forwarded-for'];
  if (xff) {
    const raw = Array.isArray(xff) ? xff.join(',') : xff;
    for (const candidate of raw.split(',').map((s) => s.trim())) {
      if (candidate && !isPrivateIp(candidate)) return candidate;
    }
  }

  // 3. X-Real-IP
  const xri = headers['x-real-ip'];
  if (xri && typeof xri === 'string' && !isPrivateIp(xri)) return xri;

  // 4. req.ip (Express com trust proxy)
  if (req.ip && !isPrivateIp(req.ip)) return req.ip;

  // 5. Fallback: IP direto do socket
  const remote = req.socket?.remoteAddress;
  if (remote) return remote;

  return undefined;
}
