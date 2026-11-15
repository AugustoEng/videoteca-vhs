'use strict';

const { ErroAplicacao } = require('./erros');

function falha(mensagem) { throw new ErroAplicacao(400, 'DADOS_INVALIDOS', mensagem); }

function texto(valor, campo, maximo, minimo = 1) {
  if (typeof valor !== 'string') falha(`O campo ${campo} deve ser texto.`);
  const limpo = valor.trim();
  if (limpo.length < minimo || limpo.length > maximo) {
    falha(`O campo ${campo} deve ter entre ${minimo} e ${maximo} caracteres.`);
  }
  return limpo;
}

function email(valor) {
  const limpo = texto(valor, 'email', 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) falha('Informe um e-mail válido.');
  return limpo;
}

function senha(valor, cadastro = false) {
  if (typeof valor !== 'string') falha('Informe a senha.');
  if (!valor || valor.length > 128) falha('Senha inválida.');
  if (cadastro && valor.length < 8) falha('A senha deve ter pelo menos 8 caracteres.');
  return valor;
}

function idUsuario(valor) {
  if (typeof valor !== 'string' || !/^USR-\d{5}$/.test(valor)) {
    falha('ID de usuário inválido. Use o formato USR-00001.');
  }
  return valor;
}

function idEmprestimo(valor) {
  if (typeof valor !== 'string' || !/^EMP-\d{4}-\d{5}$/.test(valor)) {
    falha('ID de empréstimo inválido. Use o formato EMP-2026-00001.');
  }
  return valor;
}

function inteiro(valor, nome, menor, maior) {
  if (!Number.isInteger(valor) || valor < menor || valor > maior) {
    falha(`O campo ${nome} deve ser um inteiro entre ${menor} e ${maior}.`);
  }
  return valor;
}

function booleano(valor, nome) {
  if (typeof valor !== 'boolean') falha(`O campo ${nome} deve ser verdadeiro ou falso.`);
  return valor;
}

module.exports = { texto, email, senha, idUsuario, idEmprestimo, inteiro, booleano };
