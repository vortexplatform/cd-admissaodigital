# Grafo do Codebase — admissaodigital

_Gerado em 24/07/2026 por `scripts/graphify.mjs`._

## Visão geral do workspace

```mermaid
graph LR
  api["api<br/>apps/api"]
  web["web<br/>apps/web"]
  _repo_cloudflared["@repo/cloudflared<br/>packages/cloudflared"]
  _repo_eslint_config["@repo/eslint-config<br/>packages/eslint-config"]
  _repo_typescript_config["@repo/typescript-config<br/>packages/typescript-config"]
  _repo_ui["@repo/ui<br/>packages/ui"]
  api --> _repo_eslint_config
  api --> _repo_typescript_config
  web --> _repo_eslint_config
  web --> _repo_typescript_config
  _repo_ui --> _repo_eslint_config
  _repo_ui --> _repo_typescript_config
  web -. "HTTP (axios, Bearer JWT)" .-> api
```

## apps/api — módulos NestJS

```mermaid
graph TD
  AppModule --> ConfigModule
  AppModule --> PrismaModule
  AppModule --> AuthModule
  AppModule --> UsersModule
  AppModule --> EmpresasModule
  AppModule --> RequisicoesModule
  AppModule --> CandidatosModule
  AppModule --> CandidaturasModule
  AppModule --> DocumentosTemplatesModule
  AppModule --> DocumentosModule
  AppModule --> BiometriaModule
  AppModule --> IntegracaoSeniorModule
  AppModule --> GeneralModule
  AppModule --> DashboardModule
  AuthModule --> PassportModule
  AuthModule --> JwtModule
  AuthModule --> ConfigModule
  AuthModule --> UsersModule
  BiometriaModule --> DocumentosModule
  CandidatosModule --> UsersModule
  DocumentosModule --> EmpresasModule
  DocumentosModule --> DocumentosTemplatesModule
  DocumentosTemplatesModule --> GeneralModule
  IntegracaoSeniorModule --> GeneralModule
```

| Módulo | Controllers | Services |
| --- | --- | --- |
| `AppModule` | 1 | 1 |
| `AuthModule` | 1 | 4 |
| `BiometriaModule` | 1 | 1 |
| `CandidatosModule` | 1 | 1 |
| `CandidaturasModule` | 1 | 1 |
| `DashboardModule` | 1 | 1 |
| `DocumentosModule` | 4 | 8 |
| `DocumentosTemplatesModule` | 1 | 1 |
| `EmpresasModule` | 2 | 2 |
| `GeneralModule` | 1 | 2 |
| `IntegracaoSeniorModule` | 1 | 1 |
| `PrismaModule` | 0 | 1 |
| `RequisicoesModule` | 1 | 1 |
| `UsersModule` | 1 | 1 |

## apps/web — rotas

```mermaid
graph TD
  Router["router.tsx"]
  Router --> R0["Navigate<br/>/login"]
  Router --> R1["CompanyRequiredRoute<br/>/empresa-obrigatoria"]
  Router --> R2["HomePage<br/>/"]
  Router --> R3["RequisicoesPage<br/>/requisicoes"]
  Router --> R4["RequisicaoFormPage<br/>/requisicoes/novo"]
  Router --> R5["RequisicaoFormPage<br/>/requisicoes/:id"]
  Router --> R6["RequisicaoFormPage<br/>/requisicoes/:id/editar"]
  Router --> R7["CandidatosPage<br/>/candidatos"]
  Router --> R8["CandidatoFormPage<br/>/candidatos/novo"]
  Router --> R9["CandidatoFormPage<br/>/candidatos/:id"]
  Router --> R10["CandidatoFormPage<br/>/candidatos/:id/editar"]
  Router --> R11["DocumentosRhPage<br/>/candidatos/:id/documentos"]
  Router --> R12["DocumentosRhPage<br/>/documentos"]
  Router --> R13["AssinaturasPendentesPage<br/>/assinaturas"]
  Router --> R14["AssinaturasRhPage<br/>/assinaturas/:candidatoId"]
  Router --> R15["CertificadosA1Page<br/>/certificados-a1"]
  Router --> R16["DocumentoTemplatesPage<br/>/documentos/configuracoes"]
  Router --> R17["EmpresasPage<br/>/empresas"]
  Router --> R18["UsuariosPage<br/>/usuarios"]
  Router --> R19["BiometriaPage<br/>/biometria"]
  Router --> R20["HomePage<br/>/candidato"]
  Router --> R21["CandidateDocumentosPage<br/>/candidato/documentos"]
  Router --> R22["CandidateAssinaturasPage<br/>/candidato/assinaturas"]
  Router --> R23["RegulamentoPage<br/>/candidato/regulamento"]
  Router --> R24["HomePage<br/>/candidato/status"]
  Router --> R25["VerificacaoPage<br/>/verificar/:codigo?"]
  Router --> R26["Navigate<br/>*"]
```

Guards de rota: `ProtectedRoute`, `AdminRoute`, `AdminLayoutRoute`, `CandidateLayoutRoute`, `CompanyRequiredRoute`, `CompleteProfileRoute`, `PublicRoute`.

## Entidades de dados (Prisma)

```mermaid
erDiagram
  User |o--o{ Candidato : user
  Candidato ||--o{ CandidatoDependente : candidato
  Candidato ||--o{ CandidatoValeTransporte : candidato
  Candidato ||--o{ CandidatoEtapa : candidato
  Candidato ||--o{ AceiteRegulamento : candidato
  User ||--o{ RefreshToken : user
  Empresa ||--o{ EmpresaCertificadoA1 : empresa
  User |o--o{ EmpresaCertificadoA1 : criadoPor
  User ||--o{ EmpresaUsuario : user
  Empresa ||--o{ EmpresaUsuario : empresa
  User |o--o{ RequisicaoVaga : criadoPor
  User |o--o{ RequisicaoVaga : aprovadoPor
  Empresa |o--o{ RequisicaoVaga : empresa
  RequisicaoVaga ||--o{ Candidatura : requisicao
  Candidato ||--o{ Candidatura : candidato
  User |o--o{ Candidatura : criadoPor
  User |o--o{ Candidatura : admissaoGeradaPor
  Candidatura ||--o{ EnvelopeAssinatura : candidatura
  User ||--o{ EnvelopeAssinatura : user
  User |o--o{ EnvelopeAssinatura : geradoPor
  EnvelopeAssinatura ||--o{ DocumentoAssinatura : envelope
  BiometriaSolicitacao |o--o{ DocumentoAssinatura : biometriaSolicitacao
  EmpresaCertificadoA1 |o--o{ DocumentoAssinatura : empresaCertificado
  Candidato ||--o{ BiometriaTemplate : candidato
  Candidato ||--o{ BiometriaSolicitacao : candidato
  Candidatura |o--o{ BiometriaSolicitacao : candidatura
  EnvelopeAssinatura |o--o{ BiometriaSolicitacao : envelope
  User ||--o{ BiometriaSolicitacao : solicitadaPor
  BiometriaDispositivo |o--o{ BiometriaSolicitacao : dispositivo
  EnvelopeAssinatura ||--o{ EventoAssinatura : envelope
  Empresa ||--o{ DocumentoTemplate : empresa
  DocumentoTemplate ||--o{ DocumentoTemplateSubstituicao : template
  DocumentoTemplate ||--o{ DocumentoTemplateSubstituicao : substituido
  Candidatura ||--o{ DocumentoAdmissao : candidatura
  DocumentoTemplate |o--o{ DocumentoAdmissao : template
  User |o--o{ DocumentoAdmissao : revisadoPor
  DocumentoAdmissao |o--o{ DocumentoAdmissao : dispensadoPor
```

Standalone (sem FK): `CodeOtp`, `IntegrationClient`.

## Serviços externos

| Serviço | Uso | Onde |
| --- | --- | --- |
| PostgreSQL | Banco principal (Prisma) | `apps/api/prisma/schema.prisma` |
| SMTP (nodemailer) | Envio de OTP por e-mail | `apps/api/src/auth/email.service.ts` |
| AWS SNS | Envio de OTP por SMS | `apps/api/src/auth/sms.service.ts` |
| Google (service account) | OCR de documentos | `apps/api/src/documentos/ocr.service.ts` |
| Assinatura digital A1 | Assinatura de PDFs com certificado da empresa | `apps/api/src/documentos/pdf-digital-signature.service.ts` |
| AWS S3 | Armazenamento de documentos | `apps/api/src/documentos/s3-storage.service.ts` |
| ERP Sênior | Integração de admissão e dados de RH | `apps/api/src/general/senior-api.service.ts`, `apps/api/src/integracao-senior/gerar-admissao.dto.ts`, `apps/api/src/integracao-senior/integracao-senior.controller.ts`, … |
