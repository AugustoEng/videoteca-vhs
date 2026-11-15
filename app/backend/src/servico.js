'use strict';

const { createHash, timingSafeEqual } = require('node:crypto');
const { ErroAplicacao, traduzirErroBanco } = require('./erros');
const validar = require('./validacao');
const { checarSegredo, emitirToken, lerToken } = require('./token');

const GRUPOS = Object.freeze({ 1: 'ADMIN', 2: 'ATENDENTE', 3: 'SOCIO' });
const METODOS_REPOSITORIO = [
  'buscarUsuarioPorEmail', 'buscarUsuarioPorId', 'listarUsuarios', 'listarGrupos',
  'criarUsuario', 'alterarStatusUsuario', 'listarCatalogo',
  'listarEmprestimosAtivos', 'registrarEmprestimo', 'registrarDevolucao'
];

function publico(usuario) {
  return {
    idUsuario: usuario.id_usuario,
    nome: usuario.nome,
    email: usuario.email,
    ativo: Boolean(usuario.ativo),
    idGrupo: Number(usuario.id_grupo),
    grupo: GRUPOS[usuario.id_grupo] || 'DESCONHECIDO'
  };
}

function autorizar(ator, grupos) {
  if (!grupos.includes(Number(ator.id_grupo))) {
    throw new ErroAplicacao(403, 'ACESSO_NEGADO', 'Você não tem permissão para esta operação.');
  }
}

async function operacaoBanco(callback) {
  try { return await callback(); }
  catch (erro) { throw traduzirErroBanco(erro); }
}

function criarServico(repositorio, { segredo, agora = Date.now } = {}) {
  checarSegredo(segredo);
  for (const metodo of METODOS_REPOSITORIO) {
    if (typeof repositorio?.[metodo] !== 'function') {
      throw new Error(`Repositório incompatível: falta o método ${metodo}().`);
    }
  }

  async function login({ email, senha }) {
    const endereco = validar.email(email);
    const password = validar.senha(senha);
    const encontrado = await operacaoBanco(() => repositorio.buscarUsuarioPorEmail(endereco));
    const hashInformado = createHash('sha256').update(password, 'utf8').digest('hex');
    const hashSalvo = typeof encontrado?.senha_hash === 'string' ? encontrado.senha_hash : '0'.repeat(64);
    // Comparação em tempo constante, inclusive quando o e-mail não existe.
    const a = Buffer.from(hashInformado, 'utf8');
    const b = Buffer.from(hashSalvo, 'utf8');
    const confere = a.length === b.length && timingSafeEqual(a, b);
    if (!encontrado || !confere || !Boolean(encontrado.ativo) || !GRUPOS[encontrado.id_grupo]) {
      throw new ErroAplicacao(401, 'CREDENCIAIS_INVALIDAS', 'Credenciais inválidas ou usuário inativo.');
    }
    return {
      token: emitirToken(encontrado.id_usuario, segredo, agora()),
      tipo: 'Bearer',
      expiraEmSegundos: 7200,
      usuario: publico(encontrado)
    };
  }

  async function autenticar(token) {
    const id = lerToken(token, segredo, agora());
    // Reconsulta o banco: revogação por inativação ou troca de grupo vale imediatamente.
    const usuario = await operacaoBanco(() => repositorio.buscarUsuarioPorId(id));
    if (!usuario || !Boolean(usuario.ativo) || !GRUPOS[usuario.id_grupo]) {
      throw new ErroAplicacao(401, 'NAO_AUTENTICADO', 'Sessão ausente, inválida ou expirada.');
    }
    return usuario;
  }

  async function obterPerfil(ator) { return publico(ator); }

  async function listarCatalogo(ator, filtros = {}) {
    autorizar(ator, [1, 2, 3]);
    const busca = filtros.busca === undefined || filtros.busca === '' ? '' : validar.texto(filtros.busca, 'busca', 150);
    const genero = filtros.genero === undefined || filtros.genero === '' ? '' : validar.texto(filtros.genero, 'genero', 50);
    const limite = validar.inteiro(filtros.limite ?? 20, 'limite', 1, 100);
    const pagina = validar.inteiro(filtros.pagina ?? 1, 'pagina', 1, 100000);
    const somenteDisponiveis = filtros.somenteDisponiveis === undefined
      ? false : validar.booleano(filtros.somenteDisponiveis, 'somenteDisponiveis');
    const resultado = await operacaoBanco(() => repositorio.listarCatalogo({
      busca, genero, somenteDisponiveis, limite, offset: (pagina - 1) * limite
    }));
    return { itens: resultado.itens, total: resultado.total, pagina, limite };
  }

  async function listarEmprestimos(ator, filtros = {}) {
    autorizar(ator, [1, 2, 3]);
    let idUsuario = filtros.idUsuario ? validar.idUsuario(filtros.idUsuario) : null;
    if (Number(ator.id_grupo) === 3) idUsuario = ator.id_usuario;
    const registros = await operacaoBanco(() => repositorio.listarEmprestimosAtivos({ idUsuario }));
    return { itens: registros, total: registros.length };
  }

  async function listarUsuarios(ator) {
    // Atendentes precisam localizar sócios ao registrar empréstimos,
    // mas somente administradores podem cadastrar ou alterar usuários.
    autorizar(ator, [1, 2]);
    const usuarios = await operacaoBanco(() => repositorio.listarUsuarios());
    return { itens: usuarios.map(publico), total: usuarios.length };
  }

  async function listarGrupos(ator) {
    autorizar(ator, [1]);
    return { itens: await operacaoBanco(() => repositorio.listarGrupos()) };
  }

  async function cadastrarUsuario(ator, dados = {}) {
    autorizar(ator, [1]);
    const nome = validar.texto(dados.nome, 'nome', 100, 2);
    const email = validar.email(dados.email);
    const senha = validar.senha(dados.senha, true);
    const idGrupo = validar.inteiro(dados.idGrupo, 'idGrupo', 1, 3);
    const senhaHash = createHash('sha256').update(senha, 'utf8').digest('hex');
    await operacaoBanco(() => repositorio.criarUsuario({ nome, email, senhaHash, idGrupo }));
    // A chave USR-nnnnn é gerada no MySQL pelo trigger, não no JavaScript.
    const novo = await operacaoBanco(() => repositorio.buscarUsuarioPorEmail(email));
    if (!novo) throw new ErroAplicacao(500, 'ERRO_INTERNO', 'O novo usuário não pôde ser consultado.');
    return publico(novo);
  }

  async function alterarStatus(ator, id, dados = {}) {
    autorizar(ator, [1]);
    const idValidado = validar.idUsuario(id);
    const ativo = validar.booleano(dados.ativo, 'ativo');
    if (idValidado === ator.id_usuario && !ativo) {
      throw new ErroAplicacao(409, 'REGRA_NEGOCIO', 'O administrador não pode desativar a própria conta.');
    }
    const existente = await operacaoBanco(() => repositorio.buscarUsuarioPorId(idValidado));
    if (!existente) throw new ErroAplicacao(404, 'NAO_ENCONTRADO', 'Usuário não encontrado.');
    await operacaoBanco(() => repositorio.alterarStatusUsuario(idValidado, ativo));
    return publico({ ...existente, ativo });
  }

  async function emprestar(ator, dados = {}) {
    autorizar(ator, [1, 2]);
    const idUsuario = validar.idUsuario(dados.idUsuario);
    const idFilme = validar.inteiro(dados.idFilme, 'idFilme', 1, 2147483647);
    const usuario = await operacaoBanco(() => repositorio.buscarUsuarioPorId(idUsuario));
    if (!usuario) throw new ErroAplicacao(404, 'NAO_ENCONTRADO', 'Usuário não encontrado.');
    if (!Boolean(usuario.ativo)) throw new ErroAplicacao(409, 'REGRA_NEGOCIO', 'Usuário inativo');
    if (Number(usuario.id_grupo) !== 3) {
      throw new ErroAplicacao(409, 'REGRA_NEGOCIO', 'A retirada de fitas é exclusiva para sócios.');
    }
    // A procedure sp_emprestar é a autoridade final sobre estoque, limite e transação.
    const resultado = await operacaoBanco(() => repositorio.registrarEmprestimo({ idUsuario, idFilme }));
    return { mensagem: 'Empréstimo registrado com sucesso.', idEmprestimo: resultado?.idEmprestimo ?? null };
  }

  async function devolver(ator, id) {
    autorizar(ator, [1, 2]);
    const idEmprestimo = validar.idEmprestimo(id);
    // A procedure sp_devolver calcula a multa e devolve o estoque com transação.
    await operacaoBanco(() => repositorio.registrarDevolucao({ idEmprestimo }));
    return { mensagem: 'Devolução registrada com sucesso.' };
  }

  return { login, autenticar, obterPerfil, listarCatalogo, listarEmprestimos,
    listarUsuarios, listarGrupos, cadastrarUsuario, alterarStatus, emprestar, devolver };
}

module.exports = { criarServico, GRUPOS };
