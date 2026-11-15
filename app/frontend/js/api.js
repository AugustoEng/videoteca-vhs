"use strict";
/* ===== Configuração =====
   API_BASE: endereço da API do Erick (npm run dev:demo → porta 3001).
   O front deve ser servido em http://localhost:5173, que é o CORS_ORIGIN do .env:
   cd frontend && npx serve -l 5173    (ou: python -m http.server 5173)
   MODO_DEMO: mostra botões de login rápido. Colocar false na entrega final. */
const API_BASE = "http://localhost:3001";
const MODO_DEMO = true;

class ErroApi extends Error {
  constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo; }
}

/* Sessão: o token fica no sessionStorage (some ao fechar a aba). */
const Sessao = {
  get token() { return sessionStorage.getItem("vhs_token"); },
  salvar(token) { sessionStorage.setItem("vhs_token", token); },
  limpar() { sessionStorage.removeItem("vhs_token"); }
};

/* Toda chamada passa por aqui: adiciona o Bearer e converte erros em ErroApi
   com a mensagem pronta para exibir ({erro, mensagem} do back-end). */
async function api(metodo, caminho, corpo) {
  const cab = {};
  if (corpo) cab["Content-Type"] = "application/json";
  if (Sessao.token) cab.Authorization = "Bearer " + Sessao.token;
  let r;
  try {
    r = await fetch(API_BASE + caminho, { method: metodo, headers: cab, body: corpo ? JSON.stringify(corpo) : undefined });
  } catch (_) {
    throw new ErroApi(0, "SEM_CONEXAO", "Não foi possível falar com o servidor. Verifique se a API está em execução.");
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Sessão inválida/expirada (diferente de senha errada, que vem como CREDENCIAIS_INVALIDAS)
    if (r.status === 401 && dados.erro === "NAO_AUTENTICADO") window.dispatchEvent(new Event("sessao-expirada"));
    throw new ErroApi(r.status, dados.erro || "ERRO", dados.mensagem || "Erro inesperado. Tente novamente.");
  }
  return dados;
}

const limpo = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));

/* Uma função por rota do README do Erick. */
const API = {
  login: (email, senha) => api("POST", "/api/auth/login", { email, senha }),
  me: () => api("GET", "/api/auth/me"),
  catalogo: (f = {}) => api("GET", "/api/catalogo?" + new URLSearchParams(limpo(f))),
  emprestimos: () => api("GET", "/api/emprestimos"),
  emprestar: (idUsuario, idFilme) => api("POST", "/api/emprestimos", { idUsuario, idFilme }),
  devolver: (idEmprestimo) => api("POST", `/api/emprestimos/${idEmprestimo}/devolucao`),
  usuarios: () => api("GET", "/api/usuarios"),
  criarUsuario: (d) => api("POST", "/api/usuarios", d),
  alterarStatus: (id, ativo) => api("PATCH", `/api/usuarios/${id}/status`, { ativo })
};
