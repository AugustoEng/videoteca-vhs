'use strict';

const http = require('node:http');
const { ErroAplicacao } = require('./erros');

function enviar(res, status, dados) {
  const conteudo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(conteudo);
}

async function corpoJson(req) {
  let corpo = '';
  for await (const trecho of req) {
    corpo += trecho;
    if (Buffer.byteLength(corpo) > 16384) {
      throw new ErroAplicacao(413, 'CORPO_GRANDE', 'A requisição ultrapassou o limite de 16 KB.');
    }
  }
  if (!corpo.trim()) throw new ErroAplicacao(400, 'DADOS_INVALIDOS', 'Envie um objeto JSON.');
  let dados;
  try { dados = JSON.parse(corpo); }
  catch (_) { throw new ErroAplicacao(400, 'JSON_INVALIDO', 'JSON inválido.'); }
  if (dados === null || Array.isArray(dados) || typeof dados !== 'object') {
    throw new ErroAplicacao(400, 'DADOS_INVALIDOS', 'Envie um objeto JSON.');
  }
  return dados;
}

function queryNumero(valor, nome, padrao) {
  if (valor === null) return padrao;
  if (!/^\d+$/.test(valor)) throw new ErroAplicacao(400, 'DADOS_INVALIDOS', `Parâmetro ${nome} inválido.`);
  return Number(valor);
}

function queryBooleano(valor, nome) {
  if (valor === null) return false;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  throw new ErroAplicacao(400, 'DADOS_INVALIDOS', `Parâmetro ${nome} deve ser true ou false.`);
}

function criarApi(servico, { corsOrigin = '' } = {}) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (corsOrigin && origin === corsOrigin) {
      // O front-end deve configurar uma origem exata; nunca usar '*' com autenticação.
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(origin === corsOrigin && corsOrigin ? 204 : 403);
      return res.end();
    }

    try {
      const url = new URL(req.url, 'http://localhost');
      const rota = url.pathname;
      const metodo = req.method;

      if (metodo === 'GET' && rota === '/api/saude') return enviar(res, 200, { status: 'ok' });
      if (metodo === 'POST' && rota === '/api/auth/login') {
        return enviar(res, 200, await servico.login(await corpoJson(req)));
      }

      const autorizacao = req.headers.authorization || '';
      const token = autorizacao.startsWith('Bearer ') ? autorizacao.slice(7) : '';
      if (!token) throw new ErroAplicacao(401, 'NAO_AUTENTICADO', 'Informe o token Bearer.');
      const ator = await servico.autenticar(token);

      if (metodo === 'GET' && rota === '/api/auth/me') {
        return enviar(res, 200, await servico.obterPerfil(ator));
      }
      if (metodo === 'GET' && rota === '/api/catalogo') {
        return enviar(res, 200, await servico.listarCatalogo(ator, {
          busca: url.searchParams.get('busca') || '',
          genero: url.searchParams.get('genero') || '',
          pagina: queryNumero(url.searchParams.get('pagina'), 'pagina', 1),
          limite: queryNumero(url.searchParams.get('limite'), 'limite', 20),
          somenteDisponiveis: queryBooleano(url.searchParams.get('disponiveis'), 'disponiveis')
        }));
      }
      if (metodo === 'GET' && rota === '/api/emprestimos') {
        return enviar(res, 200, await servico.listarEmprestimos(ator, {
          idUsuario: url.searchParams.get('idUsuario') || null
        }));
      }
      if (metodo === 'POST' && rota === '/api/emprestimos') {
        return enviar(res, 201, await servico.emprestar(ator, await corpoJson(req)));
      }
      const devolver = rota.match(/^\/api\/emprestimos\/(EMP-\d{4}-\d{5})\/devolucao$/);
      if (metodo === 'POST' && devolver) {
        return enviar(res, 200, await servico.devolver(ator, devolver[1]));
      }
      if (metodo === 'GET' && rota === '/api/usuarios') {
        return enviar(res, 200, await servico.listarUsuarios(ator));
      }
      if (metodo === 'POST' && rota === '/api/usuarios') {
        return enviar(res, 201, await servico.cadastrarUsuario(ator, await corpoJson(req)));
      }
      const statusUsuario = rota.match(/^\/api\/usuarios\/(USR-\d{5})\/status$/);
      if (metodo === 'PATCH' && statusUsuario) {
        return enviar(res, 200, await servico.alterarStatus(ator, statusUsuario[1], await corpoJson(req)));
      }
      if (metodo === 'GET' && rota === '/api/grupos') {
        return enviar(res, 200, await servico.listarGrupos(ator));
      }
      throw new ErroAplicacao(404, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.');
    } catch (erro) {
      const esperado = erro instanceof ErroAplicacao;
      // Não expõe SQL, segredos, stack traces nem mensagens internas ao cliente.
      if (!esperado) console.error('[videoteca] erro interno:', erro);
      if (!res.headersSent) {
        enviar(res, esperado ? erro.status : 500, {
          erro: esperado ? erro.codigo : 'ERRO_INTERNO',
          mensagem: esperado ? erro.message : 'Não foi possível concluir a operação.'
        });
      } else res.end();
    }
  });
}

module.exports = { criarApi };
