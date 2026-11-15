"use strict";
const $ = (s, e = document) => e.querySelector(s), app = $("#app"), dlg = $("#dlg");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const data = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join("/") : "–"); // AAAA-MM-DD → DD/MM/AAAA (sem fuso)
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const LIMITE = 12;
const GRUPOS = { 1: "ADMIN", 2: "ATENDENTE", 3: "SOCIO" };

/* Menu por grupo (o back-end também valida; aqui só escondemos o que não se aplica). */
const NAV = {
  ADMIN: [["catalogo", "Catálogo"], ["emprestimos", "Em aberto"], ["usuarios", "Usuários"], ["acervo", "Acervo"]],
  ATENDENTE: [["catalogo", "Catálogo"], ["retirada", "Retirada"], ["emprestimos", "Empréstimos"]],
  SOCIO: [["catalogo", "Catálogo"], ["emprestimos", "Meus empréstimos"]]
};
const S = { me: null, page: "catalogo", q: "", g: "", disp: false, pag: 1, generos: [], emp: [] };

let tt, deb;
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.style.display = "block"; clearTimeout(tt); tt = setTimeout(() => (t.style.display = "none"), 3500); };
const cab = (t, s) => `<h1>${t}</h1><p class="sub">${s}</p>`;
const msg = (ok, t) => `<div class="msg ${ok ? "good" : "err"}" role="alert">${esc(t)}</div>`;
const erroHtml = (e) => `<div class="msg err" role="alert">${esc(e.message)} <button class="sm" data-act="retry">Tentar novamente</button></div>`;

/* ---------- Catálogo e Acervo (mesma consulta, GET /api/catalogo) ---------- */
const params = () => ({ busca: S.q, genero: S.g, disponiveis: S.disp, pagina: S.pag, limite: LIMITE });

async function carregarGeneros() { // a API não tem rota de gêneros: extraímos do catálogo
  if (S.generos.length) return;
  const d = await API.catalogo({ limite: 100 });
  S.generos = [...new Set(d.itens.map((f) => f.genero))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function lista(d) {
  if (!d.itens.length) return `<p class="sub">Nenhum filme encontrado. A busca considera o início do título.</p>`;
  const corpo = S.page === "acervo"
    ? `<div class="scroll"><table><tr><th>Código</th><th>Título</th><th>Diretor</th><th>Ano</th><th>Gênero</th><th>Total de fitas</th><th>Disponíveis</th></tr>${d.itens.map((f) =>
      `<tr><td>${esc(f.codigo_catalogo)}</td><td>${esc(f.titulo)}</td><td>${esc(f.diretor)}</td><td>${esc(f.ano_lancamento)}</td><td>${esc(f.genero)}</td><td>${f.qtd_total}</td><td>${f.qtd_disponivel}</td></tr>`).join("")}</table></div>`
    : `<div class="grid">${d.itens.map((f) => {
      const n = f.qtd_disponivel;
      return `<article class="fita"><div class="lab"><small>${esc(f.codigo_catalogo)}</small><h3>${esc(f.titulo)}</h3></div><div class="meta"><span>${esc(f.genero)}</span><span class="pill ${n ? "" : "no"}">${n ? `${n} de ${f.qtd_total} disponíveis` : "Indisponível"}</span></div></article>`;
    }).join("")}</div>`;
  const paginas = Math.max(1, Math.ceil(d.total / d.limite));
  return corpo + `<div class="pager"><button class="sm" data-act="pag" data-p="${d.pagina - 1}" ${d.pagina <= 1 ? "disabled" : ""}>Anterior</button><span>Página ${d.pagina} de ${paginas} (${d.total} filmes)</span><button class="sm" data-act="pag" data-p="${d.pagina + 1}" ${d.pagina >= paginas ? "disabled" : ""}>Próxima</button></div>`;
}

async function atualizarLista() {
  const l = $("#lista");
  try { l.innerHTML = lista(await API.catalogo(params())); } catch (e) { l.innerHTML = erroHtml(e); }
}

async function paginaCatalogo() {
  await carregarGeneros();
  const d = await API.catalogo(params());
  const adm = S.page === "acervo";
  return cab(adm ? "Acervo" : "Catálogo", adm ? "Filmes cadastrados e quantidade de fitas." : "Filmes da videoteca e fitas disponíveis para retirada.") +
    `<div class="bar"><input id="q" type="search" placeholder="Buscar pelo início do título" aria-label="Buscar" value="${esc(S.q)}">
    <select id="g" aria-label="Gênero"><option value="">Todos os gêneros</option>${S.generos.map((g) => `<option ${S.g === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>
    <label class="inline"><input id="dp" type="checkbox" ${S.disp ? "checked" : ""}> Só disponíveis</label></div><div id="lista">${lista(d)}</div>`;
}

/* ---------- Empréstimos em aberto (GET /api/emprestimos) ---------- */
async function paginaEmprestimos() {
  const d = await API.emprestimos(); // sócio só recebe os próprios (filtro feito pelo back-end)
  S.emp = d.itens;
  const socio = S.me.grupo === "SOCIO", dev = S.me.grupo === "ATENDENTE";
  const titulo = socio ? cab("Meus empréstimos", `Você tem <b>${d.total} de 3</b> fitas em aberto. A multa por atraso é de R$ 2,00 por dia.`)
    : cab(S.me.grupo === "ADMIN" ? "Empréstimos em aberto" : "Empréstimos", "Fitas que ainda não foram devolvidas.");
  if (!d.itens.length) return titulo + `<p class="sub">Nenhum empréstimo em aberto.</p>`;
  return titulo + `<div class="scroll"><table><tr><th>Código</th><th>Filme</th>${socio ? "" : "<th>Sócio</th>"}<th>Retirada</th><th>Prazo</th><th>Situação</th><th>Multa prevista</th>${dev ? "<th></th>" : ""}</tr>${d.itens.map((e) => {
    const a = Number(e.dias_atraso);
    return `<tr><td>${esc(e.id_emprestimo)}</td><td>${esc(e.titulo)}</td>${socio ? "" : `<td>${esc(e.socio)}</td>`}<td>${data(e.data_retirada)}</td><td>${data(e.data_prevista)}</td>
    <td>${a > 0 ? `<span class="late tag">Atrasado (${a} ${a > 1 ? "dias" : "dia"})</span>` : `<span class="tag">No prazo</span>`}</td><td class="${a > 0 ? "late" : ""}">${brl(e.multa_prevista)}</td>
    ${dev ? `<td><button class="sm pri" data-act="dev" data-id="${esc(e.id_emprestimo)}">Devolver</button></td>` : ""}</tr>`;
  }).join("")}</table></div>`;
}

/* ---------- Retirada (POST /api/emprestimos) ---------- */
async function paginaRetirada() {
  const [d, u] = await Promise.all([API.catalogo({ disponiveis: true, limite: 100 }), API.usuarios()]); // id_filme e idUsuario são os valores enviados
  const socios = u.itens.filter((x) => x.grupo === "SOCIO");
  return cab("Registrar retirada", "Cada fita levada gera um empréstimo. O prazo de 3 dias é calculado pelo banco.") +
    `<form class="panel" data-form="ret"><label for="su">Sócio</label><select id="su" required>${socios.map((s) => `<option value="${esc(s.idUsuario)}">${esc(s.nome)} (${esc(s.idUsuario)})${s.ativo ? "" : " · inativo"}</option>`).join("")}</select>
    <label for="sf">Filme</label><select id="sf" required>${d.itens.map((f) => `<option value="${f.id_filme}">${esc(f.titulo)} (${f.qtd_disponivel} disponíveis)</option>`).join("")}</select>
    <div class="acts"><button class="pri">Registrar retirada</button></div><div id="res"></div></form>`;
}

/* ---------- Usuários (somente ADMIN) ---------- */
async function paginaUsuarios() {
  const d = await API.usuarios();
  return cab("Usuários", "Usuários não são apagados: inativos continuam no cadastro e no histórico.") +
    `<div class="bar"><button class="pri" data-act="newuser">Novo usuário</button></div><div class="scroll"><table><tr><th>Código</th><th>Nome</th><th>E-mail (login)</th><th>Grupo</th><th>Situação</th><th></th></tr>${d.itens.map((u) => {
      const eu = u.idUsuario === S.me.idUsuario;
      return `<tr><td>${esc(u.idUsuario)}</td><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.grupo)}</td><td class="tag ${u.ativo ? "ok" : "late"}">${u.ativo ? "Ativo" : "Inativo"}</td>
      <td><button class="sm" data-act="tgl" data-id="${esc(u.idUsuario)}" data-ativo="${u.ativo ? 0 : 1}" ${eu ? 'disabled title="Você não pode inativar a própria conta"' : ""}>${u.ativo ? "Inativar" : "Reativar"}</button></td></tr>`;
    }).join("")}</table></div>`;
}

const PAGES = { catalogo: paginaCatalogo, acervo: paginaCatalogo, emprestimos: paginaEmprestimos, retirada: paginaRetirada, usuarios: paginaUsuarios };

/* ---------- Estrutura da página, login e navegação ---------- */
function login(aviso = "") {
  app.innerHTML = `<div class="login"><form class="panel" data-form="login"><div class="brand" style="color:var(--ink)"><span class="reel"></span>Videoteca</div><h2>Entrar</h2>
  <label for="em">E-mail</label><input id="em" type="email" required autocomplete="username"><label for="pw">Senha</label><input id="pw" type="password" required autocomplete="current-password">
  <div class="acts"><button class="pri">Entrar</button></div><div id="le">${aviso ? msg(false, aviso) : ""}</div>
  ${MODO_DEMO ? `<p class="sub" style="margin:16px 0 0">Contas de demonstração (senha 123456):</p><div class="demo">${[["admin", "Administrador"], ["atendente", "Atendente"], ["socio1", "Sócio"], ["limite", "Sócio no limite"], ["inativo", "Sócio inativo"]].map(([u, n]) => `<button type="button" class="sm" data-act="demo" data-e="${u}@videoteca.com">${n}</button>`).join("")}</div>` : ""}</form></div>`;
}

function shell() {
  const nav = NAV[S.me.grupo];
  app.innerHTML = `<div class="app"><aside><div class="brand"><span class="reel"></span>Videoteca</div>${nav.map(([k, n]) => `<button class="${S.page === k ? "on" : ""}" data-go="${k}">${n}</button>`).join("")}
  <div class="who">${esc(S.me.nome)}<br>${esc(S.me.grupo)} (${esc(S.me.idUsuario)})<br><button class="sm" data-act="out" style="margin-top:8px;border:1px solid #3d4c60;color:inherit;background:none">Sair</button></div></aside><main id="main"></main></div>`;
}

async function go(p) {
  if (!NAV[S.me.grupo].some((n) => n[0] === p)) p = NAV[S.me.grupo][0][0];
  S.page = p; shell();
  const m = $("#main"); m.innerHTML = `<p class="sub">Carregando…</p>`;
  try { m.innerHTML = await PAGES[p](); } catch (e) { m.innerHTML = erroHtml(e); }
}

function sair(aviso) { Sessao.limpar(); S.me = null; S.generos = []; login(aviso); }
window.addEventListener("sessao-expirada", () => { if (S.me) sair("Sua sessão expirou. Entre novamente."); });

/* ---------- Eventos ---------- */
document.addEventListener("click", async (e) => {
  const g = e.target.closest("[data-go]"); if (g) return go(g.dataset.go);
  const b = e.target.closest("[data-act]"); if (!b) return;
  const d = b.dataset;
  if (d.act === "demo") { $("#em").value = d.e; $("#pw").value = "123456"; $("[data-form=login]").requestSubmit(); }
  if (d.act === "out") sair();
  if (d.act === "retry") go(S.page);
  if (d.act === "close") dlg.close();
  if (d.act === "pag") { S.pag = Number(d.p); atualizarLista(); }
  if (d.act === "tgl") {
    try { await API.alterarStatus(d.id, d.ativo === "1"); toast(d.ativo === "1" ? "Usuário reativado." : "Usuário inativado."); } catch (er) { toast(er.message); }
    go("usuarios");
  }
  if (d.act === "newuser") {
    dlg.innerHTML = `<form data-form="nu"><h2>Novo usuário</h2><label for="nn">Nome</label><input id="nn" minlength="2" maxlength="100" required>
    <label for="ne">E-mail (será o login)</label><input id="ne" type="email" required><label for="ns">Senha (mínimo 8 caracteres)</label><input id="ns" type="password" minlength="8" required autocomplete="new-password">
    <label for="ng">Grupo</label><select id="ng"><option value="3">SOCIO</option><option value="2">ATENDENTE</option><option value="1">ADMIN</option></select>
    <p class="sub" style="margin:10px 0 0">O código USR é gerado pelo banco ao salvar.</p><div id="er"></div><div class="acts"><button type="button" data-act="close">Cancelar</button><button class="pri">Salvar usuário</button></div></form>`;
    dlg.showModal();
  }
  if (d.act === "dev") {
    const x = S.emp.find((i) => i.id_emprestimo === d.id), a = Number(x.dias_atraso);
    dlg.innerHTML = `<h2>Confirmar devolução</h2><dl><dt>Empréstimo</dt><dd>${esc(x.id_emprestimo)}</dd><dt>Filme</dt><dd>${esc(x.titulo)}</dd><dt>Sócio</dt><dd>${esc(x.socio)}</dd><dt>Retirada</dt><dd>${data(x.data_retirada)}</dd><dt>Prazo</dt><dd>${data(x.data_prevista)}</dd><dt>Atraso</dt><dd>${a} ${a === 1 ? "dia" : "dias"}</dd><dt>Multa prevista</dt><dd class="${a ? "late" : ""}"><b>${brl(x.multa_prevista)}</b></dd></dl>
    <div id="er"></div><div class="acts"><button data-act="close">Cancelar</button><button class="pri" data-act="okdev" data-id="${esc(x.id_emprestimo)}">Confirmar devolução</button></div>`;
    dlg.showModal();
  }
  if (d.act === "okdev") {
    b.disabled = true;
    try { const r = await API.devolver(d.id); dlg.close(); toast(r.mensagem); go("emprestimos"); }
    catch (er) { b.disabled = false; $("#er").innerHTML = msg(false, er.message); }
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "q") { clearTimeout(deb); deb = setTimeout(() => { S.q = e.target.value.trim(); S.pag = 1; atualizarLista(); }, 300); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "g") { S.g = e.target.value; S.pag = 1; atualizarLista(); }
  if (e.target.id === "dp") { S.disp = e.target.checked; S.pag = 1; atualizarLista(); }
});

document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const k = e.target.dataset.form, btn = e.submitter;
  if (btn) btn.disabled = true;
  try {
    if (k === "login") {
      try {
        const r = await API.login($("#em").value.trim(), $("#pw").value);
        Sessao.salvar(r.token); S.me = r.usuario; go("catalogo");
      } catch (er) { $("#le").innerHTML = msg(false, er.message); }
    }
    if (k === "ret") {
      try {
        const r = await API.emprestar($("#su").value.trim().toUpperCase(), Number($("#sf").value));
        await go("retirada"); $("#res").innerHTML = msg(true, r.idEmprestimo ? `${r.mensagem} Código: ${r.idEmprestimo}.` : r.mensagem);
      } catch (er) { $("#res").innerHTML = msg(false, er.status === 409 ? `${er.message}. Nada foi gravado.` : er.message); }
    }
    if (k === "nu") {
      try {
        await API.criarUsuario({ nome: $("#nn").value.trim(), email: $("#ne").value.trim(), senha: $("#ns").value, idGrupo: Number($("#ng").value) });
        dlg.close(); toast("Usuário cadastrado."); go("usuarios");
      } catch (er) { $("#er").innerHTML = msg(false, er.message); }
    }
  } finally { if (btn) btn.disabled = false; }
});

/* ---------- Início: reaproveita a sessão se o token ainda valer ---------- */
(async () => {
  if (Sessao.token) {
    try { S.me = await API.me(); go("catalogo"); return; }
    catch (er) {
      Sessao.limpar();
      // Token vencido ou inválido: avisa; falha de rede mostra a própria mensagem.
      login(er.status === 401 ? "Sua sessão expirou. Entre novamente." : er.message);
      return;
    }
  }
  login();
})();
