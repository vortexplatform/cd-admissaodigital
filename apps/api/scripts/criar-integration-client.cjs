/* eslint-disable */
// Cria um IntegrationClient e imprime clientId/clientSecret.
// Uso (dentro de apps/api):
//   node scripts/criar-integration-client.cjs "Nome da Integração" "requisicoes:create,outro:scope"
const { randomBytes, scryptSync } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const [, , nomeArg, scopesArg] = process.argv;
const nome = nomeArg || 'Integração externa';
const scopes = (scopesArg ?? 'requisicoes:create')
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean);

const prisma = new PrismaClient();

(async () => {
  try {
    const clientId = `int_${randomBytes(12).toString('hex')}`;
    const clientSecret = randomBytes(32).toString('hex');
    const salt = randomBytes(16).toString('hex');
    const clientSecretHash = `${salt}:${scryptSync(clientSecret, salt, 64).toString('hex')}`;

    const created = await prisma.integrationClient.create({
      data: { nome, clientId, clientSecretHash, scopes },
    });

    console.log(JSON.stringify({ id: created.id, nome, clientId, clientSecret, scopes }, null, 2));
  } catch (err) {
    console.error('Falha ao criar IntegrationClient:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
