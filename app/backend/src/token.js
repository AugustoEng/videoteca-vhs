'use strict';

const { createHmac, timingSafeEqual } = require('node:crypto');
const { ErroAplicacao } = require('./erros');

function checarSegredo(segredo) {
  if (typeof segredo !== 'string' || segredo.length < 32) {
    throw new Error('AUTH_SECRET precisa conter pelo menos 32 caracteres.');
  }
}

function assinatura(dados, segredo) {
  return createHmac('sha256', segredo).update(dados).digest('base64url');
}

function emitirToken(id, segredo, agora) {
  checarSegredo(segredo);
  const payload = { sub: id, exp: Math.floor(agora / 1000) + 2 * 60 * 60 };
  const dados = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `v1.${dados}.${assinatura(`v1.${dados}`, segredo)}`;
}

function lerToken(token, segredo, agora) {
  const naoAutorizado = () => new ErroAplicacao(401, 'NAO_AUTENTICADO', 'Sessão ausente, inválida ou expirada.');
  if (typeof token !== 'string' || token.length > 4096) throw naoAutorizado();
  const partes = token.split('.');
  if (partes.length !== 3 || partes[0] !== 'v1') throw naoAutorizado();
  const esperado = Buffer.from(assinatura(`${partes[0]}.${partes[1]}`, segredo));
  const recebido = Buffer.from(partes[2]);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) throw naoAutorizado();
  try {
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    if (!payload || !/^USR-\d{5}$/.test(payload.sub) ||
        !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(agora / 1000)) {
      throw naoAutorizado();
    }
    return payload.sub;
  } catch (_) { throw naoAutorizado(); }
}

module.exports = { checarSegredo, emitirToken, lerToken };
