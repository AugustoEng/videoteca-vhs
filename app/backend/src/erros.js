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
    // Só o índice único do e-mail significa "e-mail repetido"; qualquer outra
    // chave duplicada é um conflito genérico e não deve culpar o e-mail.
    const detalhe = String(erro.sqlMessage || erro.message || '');
    if (detalhe.includes('uq_usuarios_email')) {
      return new ErroAplicacao(409, 'REGISTRO_DUPLICADO', 'O e-mail informado já está cadastrado.');
    }
    return new ErroAplicacao(409, 'CONFLITO', 'A operação conflitou com outra em andamento. Tente novamente.');
  }

  // Deadlock (1213) ou espera por trava esgotada (1205): o banco desfez a operação.
  if ([1213, 1205].includes(Number(erro?.errno))) {
    return new ErroAplicacao(409, 'CONFLITO', 'A operação conflitou com outra em andamento. Tente novamente.');
  }

  if ((Number(erro?.errno) === 1644 || erro?.sqlState === '45000') &&
      MENSAGENS_PROCEDURES.has(erro?.sqlMessage || erro?.message)) {
    const mensagem = erro.sqlMessage || erro.message;
    return new ErroAplicacao(409, 'REGRA_NEGOCIO', mensagem);
  }

  return new ErroAplicacao(500, 'ERRO_INTERNO', 'Não foi possível concluir a operação.');
}

module.exports = { ErroAplicacao, traduzirErroBanco };
