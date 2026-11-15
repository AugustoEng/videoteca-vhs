'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { criarServico } = require('../src/servico');
const { criarRepositorioDemo } = require('../src/repositorio-demo');
const { criarApi } = require('../src/api');

const SEGREDO = 'segredo_de_teste_0000000000000000000000000001';
function setup() {
  const repo = criarRepositorioDemo();
  const servico = criarServico(repo, { segredo: SEGREDO });
  const ator = (id) => repo.buscarUsuarioPorId(id);
  return { repo, servico, ator };
}

async function erroEsperado(promessa, status, mensagem) {
  await assert.rejects(promessa, erro => {
    assert.equal(erro.status, status);
    if (mensagem) assert.match(erro.message, mensagem);
    return true;
  });
}

test('login e token válidos, sem vazamento de senha_hash', async () => {
  const { servico } = setup();
  const login = await servico.login({ email: 'ADMIN@VIDEOTECA.COM', senha: '123456' });
  assert.equal(login.usuario.grupo, 'ADMIN');
  assert.ok(login.token.startsWith('v1.'));
  assert.ok(!JSON.stringify(login).includes('senha_hash'));
  const usuario = await servico.autenticar(login.token);
  assert.equal(usuario.id_usuario, 'USR-00001');
});

test('login incorreto e usuário inativo são recusados', async () => {
  const { servico } = setup();
  await erroEsperado(servico.login({ email: 'admin@videoteca.com', senha: 'senhaerrada' }), 401);
  await erroEsperado(servico.login({ email: 'ninguem@videoteca.com', senha: '123456' }), 401);
  await erroEsperado(servico.login({ email: 'inativo@videoteca.com', senha: '123456' }), 401);
});

test('token adulterado ou expirado é recusado', async () => {
  const { servico } = setup();
  const { token } = await servico.login({ email: 'socio1@videoteca.com', senha: '123456' });
  await erroEsperado(servico.autenticar(token + 'x'), 401);
  const repo = criarRepositorioDemo();
  const gerador = criarServico(repo, { segredo: SEGREDO, agora: () => 0 });
  const expirado = (await gerador.login({ email: 'socio1@videoteca.com', senha: '123456' })).token;
  await erroEsperado(servico.autenticar(expirado), 401);
});

test('revogação imediata quando sócio é desativado', async () => {
  const { servico, ator } = setup();
  const { token } = await servico.login({ email: 'socio1@videoteca.com', senha: '123456' });
  await servico.alterarStatus(await ator('USR-00001'), 'USR-00005', { ativo: false });
  await erroEsperado(servico.autenticar(token), 401);
});

test('ADMIN e ATENDENTE listam usuários; apenas ADMIN pode gerenciá-los', async () => {
  const { servico, ator } = setup();
  const administrador = await ator('USR-00001');
  const atendente = await ator('USR-00002');
  const socio = await ator('USR-00005');
  const usuariosAdmin = await servico.listarUsuarios(administrador);
  const usuariosAtendente = await servico.listarUsuarios(atendente);
  assert.equal(usuariosAdmin.total, 5);
  assert.deepEqual(usuariosAtendente, usuariosAdmin);
  assert.ok(usuariosAtendente.itens.every(usuario => !('senha_hash' in usuario)));
  await erroEsperado(servico.listarUsuarios(socio), 403);
  await erroEsperado(servico.cadastrarUsuario(atendente, {}), 403);
  await erroEsperado(servico.alterarStatus(atendente, 'USR-00005', { ativo: false }), 403);
  await erroEsperado(servico.listarGrupos(atendente), 403);
});

test('cadastro valida formato, cria ID e impede e-mail duplicado', async () => {
  const { servico, ator } = setup();
  const admin = await ator('USR-00001');
  await erroEsperado(servico.cadastrarUsuario(admin, { nome: 'A', email: 'foo', senha: '12345678', idGrupo: 3 }), 400);
  await erroEsperado(servico.cadastrarUsuario(admin, { nome: 'Fulano', email: 'foo@x.com', senha: '123', idGrupo: 3 }), 400);
  const novo = await servico.cadastrarUsuario(admin, { nome: 'Novo Sócio', email: 'NOVO@EXEMPLO.COM', senha: '12345678', idGrupo: 3 });
  assert.equal(novo.idUsuario, 'USR-00006');
  assert.equal(novo.email, 'novo@exemplo.com');
  await erroEsperado(servico.cadastrarUsuario(admin, { nome: 'Outro Sócio', email: 'novo@exemplo.com', senha: '12345678', idGrupo: 3 }), 409, /cadastrado/);
});

test('administrador não pode desativar a própria conta', async () => {
  const { servico, ator } = setup();
  await erroEsperado(servico.alterarStatus(await ator('USR-00001'), 'USR-00001', { ativo: false }), 409);
});

test('catálogo filtra título por prefixo, gênero e disponibilidade', async () => {
  const { servico, ator } = setup();
  const socio = await ator('USR-00005');
  assert.equal((await servico.listarCatalogo(socio)).total, 4);
  const filmes = await servico.listarCatalogo(socio, { busca: 'mat', somenteDisponiveis: true });
  assert.equal(filmes.total, 1);
  assert.equal(filmes.itens[0].titulo, 'Matrix');
  assert.equal((await servico.listarCatalogo(socio, { genero: 'Terror' })).total, 1);
  assert.equal((await servico.listarCatalogo(socio, { somenteDisponiveis: true })).total, 3);
});

test('consulta de empréstimos só mostra os próprios ao sócio', async () => {
  const { servico, ator } = setup();
  const limite = await ator('USR-00004');
  const resultado = await servico.listarEmprestimos(limite, { idUsuario: 'USR-00005' });
  assert.equal(resultado.total, 3);
  assert.ok(resultado.itens.every(e => e.id_usuario === 'USR-00004'));
});

test('sócio não pode emprestar nem devolver diretamente', async () => {
  const { servico, ator } = setup();
  const socio = await ator('USR-00005');
  await erroEsperado(servico.emprestar(socio, { idUsuario: 'USR-00005', idFilme: 2 }), 403);
  await erroEsperado(servico.devolver(socio, 'EMP-2026-00001'), 403);
});

test('empréstimo limita usuários, estoque e máximo de três fitas', async () => {
  const { servico, ator } = setup();
  const atendente = await ator('USR-00002');
  await erroEsperado(servico.emprestar(atendente, { idUsuario: 'USR-00003', idFilme: 2 }), 409, /inativo/);
  await erroEsperado(servico.emprestar(atendente, { idUsuario: 'USR-00005', idFilme: 1 }), 409, /disponível/);
  await erroEsperado(servico.emprestar(atendente, { idUsuario: 'USR-00004', idFilme: 4 }), 409, /Limite/);
  await erroEsperado(servico.emprestar(atendente, { idUsuario: 'USR-00001', idFilme: 2 }), 409, /sócios/);
  assert.equal((await servico.listarCatalogo(atendente, { busca: 'O Exorcista' })).itens[0].qtd_disponivel, 4);
});

test('retirada e devolução atualizam estoque e recusam segunda devolução', async () => {
  const { servico, ator } = setup();
  const atendente = await ator('USR-00002');
  await servico.emprestar(atendente, { idUsuario: 'USR-00005', idFilme: 4 });
  const catalogo = await servico.listarCatalogo(atendente, { busca: 'O Exorcista' });
  assert.equal(catalogo.itens[0].qtd_disponivel, 3);
  const ativos = await servico.listarEmprestimos(atendente, { idUsuario: 'USR-00005' });
  assert.equal(ativos.total, 1);
  const id = ativos.itens[0].id_emprestimo;
  await servico.devolver(atendente, id);
  assert.equal((await servico.listarCatalogo(atendente, { busca: 'O Exorcista' })).itens[0].qtd_disponivel, 4);
  await erroEsperado(servico.devolver(atendente, id), 409, /devolvido/);
});

test('integração HTTP: login, catálogo view e usuários entidade', async () => {
  const { servico } = setup();
  const api = criarApi(servico);
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${api.address().port}`;
  try {
    let resposta = await fetch(url + '/api/catalogo');
    assert.equal(resposta.status, 401);
    resposta = await fetch(url + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@videoteca.com', senha: '123456' })
    });
    assert.equal(resposta.status, 200);
    const login = await resposta.json();
    assert.equal(login.usuario.grupo, 'ADMIN');
    const headers = { Authorization: `Bearer ${login.token}` };
    resposta = await fetch(url + '/api/catalogo?busca=Matrix', { headers });
    assert.equal((await resposta.json()).itens[0].titulo, 'Matrix');
    resposta = await fetch(url + '/api/usuarios', { headers });
    assert.equal((await resposta.json()).total, 5);
    // A listagem também está disponível ao ATENDENTE, sem liberar cadastro.
    resposta = await fetch(url + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'atendente@videoteca.com', senha: '123456' })
    });
    const loginAtendente = await resposta.json();
    const headersAtendente = { Authorization: `Bearer ${loginAtendente.token}` };
    resposta = await fetch(url + '/api/usuarios', { headers: headersAtendente });
    assert.equal(resposta.status, 200);
    const usuariosAtendente = await resposta.json();
    assert.equal(usuariosAtendente.total, 5);
    assert.ok(usuariosAtendente.itens.every(usuario => !('senha_hash' in usuario)));
    resposta = await fetch(url + '/api/usuarios', {
      method: 'POST', headers: { ...headersAtendente, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste', email: 'teste@exemplo.com', senha: '12345678', idGrupo: 3 })
    });
    assert.equal(resposta.status, 403);
    resposta = await fetch(url + '/api/nao-existe', { headers });
    assert.equal(resposta.status, 404);
    resposta = await fetch(url + '/api/usuarios', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(resposta.status, 400);
  } finally { await new Promise(resolve => api.close(resolve)); }
});

test('traduzirErroBanco: 1062 só vira "e-mail cadastrado" no índice do e-mail', () => {
  const { traduzirErroBanco } = require('../src/erros');
  const email = traduzirErroBanco({ errno: 1062, sqlMessage: "Duplicate entry 'a@b.c' for key 'usuarios.uq_usuarios_email'" });
  assert.equal(email.status, 409);
  assert.match(email.message, /e-mail/);
  const outra = traduzirErroBanco({ errno: 1062, sqlMessage: "Duplicate entry 'USR-00009' for key 'usuarios.PRIMARY'" });
  assert.equal(outra.status, 409);
  assert.doesNotMatch(outra.message, /e-mail/);
  assert.match(traduzirErroBanco({ errno: 1213 }).message, /Tente novamente/);
  assert.match(traduzirErroBanco({ errno: 1205 }).message, /Tente novamente/);
});

test('retirada devolve o código do empréstimo', async () => {
  const { servico, ator } = setup();
  const admin = await ator('USR-00001');
  const r = await servico.emprestar(admin, { idUsuario: 'USR-00005', idFilme: 4 });
  assert.match(r.idEmprestimo, /^EMP-\d{4}-\d{5}$/);
});
