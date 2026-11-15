# Front-end – Videoteca VHS (Davi)

Interface web do projeto *Videoteca VHS* (UCB, Laboratório de Banco de Dados). Feita em **HTML, CSS e JavaScript puro**, sem frameworks, sem build e sem dependências. Consome a API do `app/backend/` (Erick) pelas rotas `/api/*`.

> **Status:** o código passou por checagem de sintaxe (`node --check`), mas **ainda não foi testado contra a API em execução**. O primeiro teste de integração deve ser feito com `npm run dev:demo` (roteiro na seção 6).

Sugestão de local no repositório: `app/frontend/`, ao lado de `app/backend/`.

---

## 1. Estrutura

```text
frontend/
├── index.html        # Casca da página: #app, <dialog> e aviso (toast)
├── css/
│   └── estilos.css   # Visual (claro/escuro automático)
└── js/
    ├── api.js        # Configuração + TODAS as chamadas HTTP à API
    └── app.js        # Telas, navegação por perfil e eventos
```

- **`api.js`** é o único arquivo que conhece a API: endereço, token, cabeçalhos e tratamento de erros. Se uma rota mudar, é aqui que se altera.
- **`app.js`** só chama as funções do objeto `API` e desenha as telas. Não contém regra de negócio.

## 2. Como rodar

Requisitos: Node.js 20+ (o mesmo do back-end).

```bash
# Terminal 1 – back-end em modo demonstração
cd app/backend
npm run dev:demo          # API em http://localhost:3001

# Terminal 2 – front-end
cd app/frontend
npx serve -l 5173         # ou: python -m http.server 5173
```

Abrir **`http://localhost:5173`**.

Pontos importantes:

- O front **precisa** ser servido em `http://localhost:5173`, porque o `api.js` do back-end só libera CORS para a origem exata de `CORS_ORIGIN` (`demo.env` e `.env.example` já usam essa). Abrir o `index.html` por `file://` ou usar `127.0.0.1:5173` (outra origem) faz o navegador bloquear as chamadas.
- Se a origem do front mudar, ajustar `CORS_ORIGIN` no `.env` do back-end.
- O endereço da API está em `API_BASE` no início de `js/api.js` (padrão `http://localhost:3001`). Se o navegador não conseguir conectar por `localhost` (alguns ambientes resolvem para IPv6 e o servidor escuta em `127.0.0.1`), trocar para `http://127.0.0.1:3001`; isso não afeta o CORS, que depende só da origem do front.

### Configuração (`js/api.js`)

| Constante | Função |
|---|---|
| `API_BASE` | URL base da API |
| `MODO_DEMO` | `true` mostra botões de login rápido com as contas de demonstração. **Colocar `false` na entrega final.** |

## 3. Telas por perfil

O menu muda conforme o campo `grupo` devolvido no login. Isso é só conveniência de interface: **quem autoriza de verdade é o back-end** (403 em qualquer rota proibida).

| Perfil | Telas |
|---|---|
| `SOCIO` | Catálogo; Meus empréstimos (em aberto, com contador "N de 3") |
| `ATENDENTE` | Catálogo; Retirada; Empréstimos (com botão **Devolver**) |
| `ADMIN` | Catálogo; Em aberto (somente leitura); Usuários; Acervo (somente consulta) |

O mapa está na constante `NAV` do `app.js`.

## 4. Integração: tela × rota × campos

| Tela / ação | Rota | O que o front envia | O que o front lê |
|---|---|---|---|
| Login | `POST /api/auth/login` | `{email, senha}` | `token`, `usuario.{idUsuario, nome, grupo}` |
| Reabrir a aba | `GET /api/auth/me` | token | mesmos campos do usuário |
| Catálogo / Acervo | `GET /api/catalogo` | `busca`, `genero`, `disponiveis`, `pagina`, `limite=12` | `itens[].{id_filme, codigo_catalogo, titulo, diretor, ano_lancamento, genero, qtd_total, qtd_disponivel}`, `total`, `pagina`, `limite` |
| Empréstimos em aberto | `GET /api/emprestimos` | token (sócio recebe só os seus) | `id_emprestimo, socio, titulo, data_retirada, data_prevista, dias_atraso, multa_prevista`, `total` |
| Retirada | `POST /api/emprestimos` | `{idUsuario: "USR-00005", idFilme: <inteiro>}` | `mensagem` |
| Devolução | `POST /api/emprestimos/:id/devolucao` | nada no corpo | `mensagem` |
| Listar usuários (tela Usuários e lista de sócios da Retirada) | `GET /api/usuarios` | token ADMIN ou ATENDENTE | `itens[].{idUsuario, nome, email, ativo, grupo}` |
| Cadastrar usuário | `POST /api/usuarios` | `{nome, email, senha (≥8), idGrupo: 1\|2\|3}` | (recarrega a lista) |
| Inativar / reativar | `PATCH /api/usuarios/:id/status` | `{ativo: true\|false}` | (recarrega a lista) |

Convenções que o front assume (conforme o README e o contrato do Erick):

- **Datas** chegam como `AAAA-MM-DD` (driver com `dateStrings`). O front formata fatiando a string, sem `new Date()`, para evitar deslocamento de fuso. Se vier no formato ISO completo, os 10 primeiros caracteres são usados.
- **`multa_prevista`** vem como texto numérico (`"4.00"`) e é formatada em reais. O front **não calcula** multa, prazo, estoque nem limite: tudo vem do banco.
- Os **códigos** `USR-00001` e `EMP-AAAA-00001` são só exibidos, nunca gerados no front.

### Tratamento de erros

`api()` converte qualquer falha em um `ErroApi(status, codigo, mensagem)`, usando o `{erro, mensagem}` da API. As telas mostram a `mensagem` ao usuário.

- `401` com `erro: "NAO_AUTENTICADO"`: dispara o evento `sessao-expirada`, que limpa o token e volta ao login com aviso. (Senha errada vem como `CREDENCIAIS_INVALIDAS` e **não** derruba a sessão.)
- `409` na retirada: a mensagem da procedure é exibida seguida de "Nada foi gravado.", refletindo a RN de tudo ou nada.
- Falha de rede: "Não foi possível falar com o servidor…", com botão **Tentar novamente**.

### Segurança

- Token Bearer em `sessionStorage` (some ao fechar a aba). Nenhum segredo no front.
- Todo texto vindo da API passa por `esc()` antes de entrar no HTML (proteção contra XSS).
- O front nunca acessa o MySQL; só a API, que usa `app_videoteca`.

## 5. Como alterar

- **Mudar endereço da API ou desligar o modo demo:** constantes no topo de `js/api.js`.
- **Nova rota:** adicionar uma linha no objeto `API` (`api.js`) e chamar de `app.js`.
- **Nova tela:** criar uma função assíncrona que devolve o HTML (modelo: `paginaUsuarios`), registrá-la em `PAGES` e incluí-la em `NAV` para os perfis que podem vê-la.
- **Mudar quem vê o quê:** editar `NAV`. A API permite que `ADMIN` também registre retiradas e devoluções; o front deixou isso só com o `ATENDENTE`, conforme as RNs. Para liberar ao admin, basta colocar a tela em `NAV.ADMIN` e trocar `dev = S.me.grupo === "ATENDENTE"` por uma checagem que inclua `ADMIN`.
- **Visual:** cores e tema no bloco `:root` de `css/estilos.css`.

## 6. Roteiro de teste (modo demo, senha `123456`)

| Conta | O que verificar |
|---|---|
| `socio1@videoteca.com` | Só vê catálogo e os próprios empréstimos; menu sem telas de gestão |
| `limite@videoteca.com` | Mostra "3 de 3"; um atraso exibe multa prevista |
| `inativo@videoteca.com` | Login recusado com mensagem |
| `atendente@videoteca.com` | Retirada para `USR-00005`; erro de limite para `USR-00004`; devolução com confirmação |
| `admin@videoteca.com` | Cadastrar usuário (senha ≥ 8), e-mail duplicado dá erro, inativar/reativar; não consegue inativar a própria conta |

Também testar: busca por início do título (ex.: `Mat`), filtro de gênero, "Só disponíveis", paginação, derrubar a API durante o uso (mensagem de conexão) e esperar o token expirar.

## 7. Lacunas entre as RNs e as rotas atuais (pedidos ao back-end)

O front só usa o que a API expõe. Estes pontos hoje não são atendidos:

1. **Histórico permanente de empréstimos.** `GET /api/emprestimos` retorna só os em aberto (`vw_emprestimos_ativos`). Falta uma rota (por exemplo, a mesma com `?situacao=todos`, ou uma view de histórico) com `data_devolucao` e multa cobrada. Hoje não existe tela de histórico e o sócio não vê empréstimos já devolvidos.
2. **Gestão do acervo pelo ADMIN.** Não há rotas para cadastrar filme, editar total de fitas ou cadastrar gênero. A tela de Acervo é somente consulta.
3. **Lista de gêneros.** Não há rota; o filtro é montado a partir de até 100 filmes do catálogo. Sugestão: `GET /api/generos`.
4. **Busca por código de catálogo.** A busca atual é pelo início do título; o front avisa isso no campo.

Quando as rotas existirem, o ajuste no front é pequeno: novas funções em `api.js` e novas telas ou colunas em `app.js`.
