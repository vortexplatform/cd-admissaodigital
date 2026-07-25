#!/usr/bin/env node
/**
 * Gera docs/codebase-graph.md com grafos Mermaid do workspace.
 *
 * Uso:
 *   node scripts/graphify.mjs [dir] [--watch]
 *   pnpm graphify            # gera uma vez a partir de "."
 *   pnpm graphify --watch    # regenera ao salvar arquivos .ts/.tsx/.prisma/.json/.yaml
 *
 * Sem dependências externas: o modo watch usa fs.watch nativo (recursive, macOS/Windows).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const targetArg = args.find((a) => !a.startsWith('--')) ?? '.';
const TARGET = path.resolve(ROOT, targetArg);
const OUT = path.join(ROOT, 'docs', 'codebase-graph.md');
const WATCH_EXTENSIONS = /\.(ts|tsx|prisma|json|ya?ml)$/;

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const readJson = (p) => JSON.parse(read(p));

function walk(dir, filter, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', 'coverage', '.turbo', '.git'].includes(entry.name)) continue;
      walk(full, filter, out);
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out;
}

/** Extrai o conteúdo de um array balanceado após `key` (ex.: `imports:`). */
function extractArray(src, key) {
  const keyIndex = src.indexOf(key);
  if (keyIndex < 0) return '';
  const start = src.indexOf('[', keyIndex);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) return src.slice(start + 1, i);
    }
  }
  return '';
}

// ---------- workspace ----------

function workspacePackages() {
  const yamlPath = path.join(ROOT, 'pnpm-workspace.yaml');
  if (!exists(yamlPath)) return [];
  const globs = [...read(yamlPath).matchAll(/^\s*-\s*["']?([^"'\n]+?)["']?\s*$/gm)]
    .map((m) => m[1])
    .filter((g) => !g.startsWith('!'));
  const pkgs = [];
  for (const g of globs) {
    const dirs = g.endsWith('/*')
      ? fs
          .readdirSync(path.join(ROOT, g.slice(0, -2)), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => path.join(g.slice(0, -2), d.name))
      : [g];
    for (const dir of dirs) {
      const pkgPath = path.join(ROOT, dir, 'package.json');
      if (!exists(pkgPath)) continue;
      const pkg = readJson(pkgPath);
      const internal = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
        .filter(([, version]) => String(version).startsWith('workspace:'))
        .map(([name]) => name);
      pkgs.push({ dir, name: pkg.name ?? dir, internal });
    }
  }
  return pkgs;
}

// ---------- apps/api (NestJS) ----------

function apiModules() {
  const src = path.join(ROOT, 'apps/api/src');
  if (!exists(src)) return null;
  return walk(src, (f) => f.endsWith('.module.ts')).map((file) => {
    const code = read(file);
    const name = code.match(/export class (\w+Module)/)?.[1] ?? path.basename(file, '.module.ts');
    const imports = [
      ...new Set(
        [...extractArray(code, 'imports').matchAll(/\b(\w+Module)\b/g)]
          .map((m) => m[1])
          .filter((m) => m !== name),
      ),
    ];
    const dirEntries = fs.readdirSync(path.dirname(file));
    return {
      name,
      imports,
      controllers: dirEntries.filter((f) => f.endsWith('.controller.ts')).length,
      services: dirEntries.filter((f) => f.endsWith('.service.ts')).length,
    };
  });
}

// ---------- apps/web (React Router) ----------

function webRoutes() {
  const routerPath = path.join(ROOT, 'apps/web/src/router.tsx');
  if (!exists(routerPath)) return null;
  const code = read(routerPath);
  const routes = [...code.matchAll(/path="([^"]+)"\s+element=\{<(\w+)/g)].map((m) => ({
    path: m[1],
    component: m[2],
  }));
  const guards = [...new Set([...code.matchAll(/function (\w+Route)\b/g)].map((m) => m[1]))];
  return { routes, guards };
}

// ---------- Prisma ----------

function prismaModels() {
  const schemaPath = path.join(ROOT, 'apps/api/prisma/schema.prisma');
  if (!exists(schemaPath)) return null;
  const blocks = read(schemaPath)
    .split(/(?=^model )/m)
    .filter((b) => b.startsWith('model '));
  return blocks.map((block) => {
    const name = block.match(/^model (\w+)/m)[1];
    const rels = [...block.matchAll(/^\s+(\w+)\s+(\w+)(\?)?[^\n]*@relation\([^\n)]*fields:/gm)].map(
      (m) => ({ field: m[1], target: m[2], optional: !!m[3] }),
    );
    return { name, rels };
  });
}

// ---------- serviços externos ----------

const SERVICE_SIGNATURES = [
  { match: '@aws-sdk/client-s3', name: 'AWS S3', use: 'Armazenamento de documentos' },
  { match: '@aws-sdk/client-sns', name: 'AWS SNS', use: 'Envio de OTP por SMS' },
  { match: 'nodemailer', name: 'SMTP (nodemailer)', use: 'Envio de OTP por e-mail' },
  { match: 'google-auth-library', name: 'Google (service account)', use: 'OCR de documentos' },
  { match: '@signpdf', name: 'Assinatura digital A1', use: 'Assinatura de PDFs com certificado da empresa' },
];

function externalServices() {
  const src = path.join(ROOT, 'apps/api/src');
  if (!exists(src)) return [];
  const files = walk(src, (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
  const found = new Map();
  const add = (sig, file) => {
    if (!found.has(sig.name)) found.set(sig.name, { ...sig, files: [] });
    found.get(sig.name).files.push(path.relative(ROOT, file));
  };
  for (const file of files) {
    const code = read(file);
    for (const sig of SERVICE_SIGNATURES) {
      if (code.includes(sig.match)) add(sig, file);
    }
    if (/senior/i.test(file)) {
      add({ name: 'ERP Sênior', use: 'Integração de admissão e dados de RH' }, file);
    }
  }
  return [...found.values()];
}

// ---------- markdown ----------

function generate() {
  if (!exists(TARGET)) {
    console.error(`[graphify] diretório não encontrado: ${TARGET}`);
    process.exit(1);
  }
  const date = new Date().toLocaleDateString('pt-BR');
  const lines = ['# Grafo do Codebase — admissaodigital', ''];
  lines.push(`_Gerado em ${date} por \`scripts/graphify.mjs\`._`, '');

  const pkgs = workspacePackages();
  if (pkgs.length) {
    const mermaidId = (name) => name.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push('## Visão geral do workspace', '', '```mermaid', 'graph LR');
    for (const p of pkgs) lines.push(`  ${mermaidId(p.name)}["${p.name}<br/>${p.dir}"]`);
    for (const p of pkgs) {
      for (const dep of p.internal) lines.push(`  ${mermaidId(p.name)} --> ${mermaidId(dep)}`);
    }
    if (pkgs.some((p) => p.name === 'web') && pkgs.some((p) => p.name === 'api')) {
      lines.push('  web -. "HTTP (axios, Bearer JWT)" .-> api');
    }
    lines.push('```', '');
  }

  const modules = apiModules();
  if (modules) {
    lines.push('## apps/api — módulos NestJS', '', '```mermaid', 'graph TD');
    for (const m of modules) {
      for (const imp of m.imports) lines.push(`  ${m.name} --> ${imp}`);
    }
    lines.push('```', '');
    lines.push('| Módulo | Controllers | Services |', '| --- | --- | --- |');
    for (const m of modules) lines.push(`| \`${m.name}\` | ${m.controllers} | ${m.services} |`);
    lines.push('');
  }

  const web = webRoutes();
  if (web) {
    lines.push('## apps/web — rotas', '', '```mermaid', 'graph TD', '  Router["router.tsx"]');
    web.routes.forEach((r, i) => lines.push(`  Router --> R${i}["${r.component}<br/>${r.path}"]`));
    lines.push('```', '');
    lines.push(`Guards de rota: ${web.guards.map((g) => `\`${g}\``).join(', ')}.`, '');
  }

  const models = prismaModels();
  if (models) {
    const names = new Set(models.map((m) => m.name));
    lines.push('## Entidades de dados (Prisma)', '', '```mermaid', 'erDiagram');
    for (const m of models) {
      for (const r of m.rels) {
        if (!names.has(r.target)) continue;
        lines.push(`  ${r.target} ${r.optional ? '|o' : '||'}--o{ ${m.name} : ${r.field}`);
      }
    }
    lines.push('```', '');
    const referenced = new Set(models.flatMap((m) => m.rels.map((r) => r.target)));
    const standalone = models.filter((m) => !m.rels.length && !referenced.has(m.name));
    if (standalone.length) {
      lines.push(`Standalone (sem FK): ${standalone.map((m) => `\`${m.name}\``).join(', ')}.`, '');
    }
  }

  const services = externalServices();
  if (services.length || models) {
    lines.push('## Serviços externos', '', '| Serviço | Uso | Onde |', '| --- | --- | --- |');
    if (models) {
      lines.push('| PostgreSQL | Banco principal (Prisma) | `apps/api/prisma/schema.prisma` |');
    }
    for (const s of services) {
      const where = s.files.slice(0, 3).map((f) => `\`${f}\``).join(', ');
      lines.push(`| ${s.name} | ${s.use} | ${where}${s.files.length > 3 ? ', …' : ''} |`);
    }
    lines.push('');
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`[graphify] ${path.relative(ROOT, OUT)} atualizado`);
}

generate();

if (WATCH) {
  console.log(`[graphify] observando ${path.relative(ROOT, TARGET) || '.'} (Ctrl+C para sair)`);
  let timer;
  fs.watch(TARGET, { recursive: true }, (_event, file) => {
    if (!file || !WATCH_EXTENSIONS.test(file)) return;
    if (/node_modules|\.git|dist|\.turbo/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        generate();
      } catch (err) {
        console.error('[graphify] erro ao regenerar:', err.message);
      }
    }, 300);
  });
}
