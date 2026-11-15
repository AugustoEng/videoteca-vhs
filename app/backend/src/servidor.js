'use strict';

const { criarServico } = require('./servico');
const { criarApi } = require('./api');

async function iniciar() {
  const demo = process.env.DEMO_MODE === '1';
  let repositorio;
  if (demo) {
    ({ criarRepositorioDemo: repositorio } = require('./repositorio-demo'));
    repositorio = repositorio();
    console.warn('Modo DEMO: dados em memória, sem conexão MySQL. Não usar em produção.');
  } else {
    const usuarioBanco = (process.env.DB_USER || '').toLowerCase();
    if (usuarioBanco === 'root') {
      throw new Error('A aplicação não pode conectar-se ao MySQL como root.');
    }
    if (usuarioBanco === 'admin_videoteca') {
      throw new Error('A aplicação não pode conectar-se ao MySQL como admin_videoteca; use app_videoteca.');
    }
    const caminho = process.env.REPOSITORIO_MODULE || './repositorios/mysql-repository';
    let modulo;
    try { modulo = require(caminho); }
    catch (erro) {
      throw new Error(`Adaptador MySQL indisponível (${caminho}). Christopher precisa implementar o contrato em CONTRATO_REPOSITORIO.md.`, { cause: erro });
    }
    if (typeof modulo.criarRepositorio !== 'function') throw new Error('O adaptador deve exportar criarRepositorio().');
    repositorio = await modulo.criarRepositorio();
  }

  const servico = criarServico(repositorio, { segredo: process.env.AUTH_SECRET });
  const api = criarApi(servico, { corsOrigin: process.env.CORS_ORIGIN || '' });
  const porta = Number(process.env.PORT || 3001);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT inválida.');
  const host = process.env.HOST || '127.0.0.1';
  if (demo && host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('No modo demonstração o servidor deve usar HOST=127.0.0.1.');
  }
  api.listen(porta, host, () => console.log(`Videoteca VHS API: http://${host}:${porta}/api/saude`));
  const parar = () => api.close(() => process.exit(0));
  process.once('SIGINT', parar);
  process.once('SIGTERM', parar);
}

if (require.main === module) iniciar().catch(erro => { console.error(erro); process.exitCode = 1; });

module.exports = { iniciar };
