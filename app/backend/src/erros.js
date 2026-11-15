'use strict';

class ErroAplicacao extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem);
    this.name = 'ErroAplicacao';
    this.status = status;
    this.codigo = codigo;
  }
}

const MENSAGENS_PROCEDURES = new Set([
  'Usuário não encontrado',
  'Usuário inativo',
  'Filme não encontrado',
  'Nenhuma fita disponível para este filme',
  'Limite de 3 fitas em aberto atingido',
  'Empréstimo não encontrado',
  'Empréstimo já devolvido'
]);

function traduzirErroBanco(erro) {
  if (erro instanceof ErroAplicacao) return erro;

  if (Number(erro?.errno) === 1062 || erro?.code === 'ER_DUP_ENTRY') {
    return new ErroAplicacao(409, 'REGISTRO_DUPLICADO', 'O e-mail informado já está cadastrado.');
  }

  if ((Number(erro?.errno) === 1644 || erro?.sqlState === '45000') &&
      MENSAGENS_PROCEDURES.has(erro?.sqlMessage || erro?.message)) {
    const mensagem = erro.sqlMessage || erro.message;
    return new ErroAplicacao(409, 'REGRA_NEGOCIO', mensagem);
  }

  return new ErroAplicacao(500, 'ERRO_INTERNO', 'Não foi possível concluir a operação.');
}

module.exports = { ErroAplicacao, traduzirErroBanco };
