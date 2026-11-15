# Front-end da Videoteca VHS

Interface web da Videoteca VHS, feita em HTML, CSS e JavaScript puro, sem frameworks, sem build e sem dependências. Ela consome a API de `app/backend/` pelas rotas `/api/*` e nunca acessa o MySQL diretamente.

- Interface: Davi Gabriel Ramos Pereira

Testada contra a API ligada ao banco MySQL real e também no modo demonstração.

## 1. Estrutura

```text
frontend/
├── index.html        Estrutura da página: área principal, janela de diálogo e aviso
├── css/
│   └── estilos.css   Visual, com tema claro e escuro automático
└── js/
    ├── api.js        Configuração e todas as chamadas à API
    └── app.js        Telas, navegação por perfil e eventos
```

- **`api.js`** é o único arquivo que conhece a API: endereço, token, cabeçalhos e tratamento de erros. Se uma rota mudar, a alteração é feita aqui.
- **`app.js`** só chama as funções do objeto `API` e desenha as telas. Não contém regra de negócio.

## 2. Como rodar

Primeiro suba o back-end, conforme o [`app/backend/README.md`](../backend/README.md):

```bash
cd app/backend
npm start             # com o MySQL
# ou: npm run dev:demo  (sem MySQL, dados simulados)
```

Depois, em outro terminal, sirva o front:

```bash
cd app/frontend
python -m http.server 5173     # ou: npx serve -l 5173
```

Abra `http://localhost:5173`.

Pontos importantes:

- O front precisa ser aberto em `http://localhost:5173`, porque o back-end só libera chamadas da origem definida em `CORS_ORIGIN`. Abrir o `index.html` direto do arquivo, ou por `127.0.0.1:5173`, faz o navegador bloquear as chamadas.
- Se a origem do front mudar, ajuste o `CORS_ORIGIN` no `.env` do back-end.
- O endereço da API está em `API_BASE`, no início de `js/api.js` (padrão `http://localhost:3001`). Se o navegador não conectar por `localhost`, troque para `http://127.0.0.1:3001`. Isso não afeta o CORS, que depende só da origem do front.

### Configuração em `js/api.js`

| Constante   | Função |
|-------------|--------|
| `API_BASE`  | Endereço da API |
| `MODO_DEMO` | `true` mostra os botões de login rápido com as contas de teste, úteis na apresentação. `false` esconde os botões. |

## 3. Telas por perfil

O menu muda conforme o grupo devolvido no login. Isso é só conveniência de interface: quem autoriza de verdade é o back-end, que responde `403` a qualquer rota proibida.

| Perfil      | Telas |
|-------------|-------|
| `SOCIO`     | Catálogo; Meus empréstimos (em aberto, com o contador "N de 3") |
| `ATENDENTE` | Catálogo; Retirada (lista de sócios e filmes disponíveis); Empréstimos (com o botão Devolver) |
| `ADMIN`     | Catálogo; Em aberto (somente leitura); Usuários; Acervo (somente consulta) |

O mapa está na constante `NAV` do `app.js`.

## 4. Integração: tela, rota e campos

| Tela ou ação | Rota | O que o front envia | O que o front lê |
|---|---|---|---|
| Login | `POST /api/auth/login` | `{email, senha}` | `token`, `usuario.{idUsuario, nome, grupo}` |
| Reabrir a aba | `GET /api/auth/me` | token | os mesmos campos do usuário |
| Catálogo e Acervo | `GET /api/catalogo` | `busca`, `genero`, `disponiveis`, `pagina`, `limite` | `itens[].{id_filme, codigo_catalogo, titulo, diretor, ano_lancamento, genero, qtd_total, qtd_disponivel}`, `total`, `pagina`, `limite` |
| Empréstimos em aberto | `GET /api/emprestimos` | token (o sócio recebe só os seus) | `id_emprestimo, socio, titulo, data_retirada, data_prevista, dias_atraso, multa_prevista`, `total` |
| Retirada | `POST /api/emprestimos` | `{idUsuario, idFilme}` | `mensagem` |
| Devolução | `POST /api/emprestimos/:id/devolucao` | nada no corpo | `mensagem` |
| Usuários e lista de sócios da Retirada | `GET /api/usuarios` | token de ADMIN ou ATENDENTE | `itens[].{idUsuario, nome, email, ativo, grupo}` |
| Cadastrar usuário | `POST /api/usuarios` | `{nome, email, senha (mínimo 8), idGrupo: 1, 2 ou 3}` | recarrega a lista |
| Inativar ou reativar | `PATCH /api/usuarios/:id/status` | `{ativo: true ou false}` | recarrega a lista |

O que o front assume:

- **Datas** chegam como `AAAA-MM-DD`. O front formata fatiando o texto, sem `new Date()`, para não deslocar o dia por causa do fuso.
- **`multa_prevista`** chega como texto numérico (`"4.00"`) e é formatada em reais. O front não calcula multa, prazo, estoque nem limite: tudo vem do banco.
- **Os códigos** `USR-00001` e `EMP-AAAA-00001` são só exibidos, nunca gerados no front.

### Tratamento de erros

A função `api()` transforma qualquer falha num `ErroApi(status, codigo, mensagem)`, usando o `{erro, mensagem}` da API. As telas mostram a `mensagem` ao usuário.

- `401` com `erro: "NAO_AUTENTICADO"`: limpa o token e volta ao login com aviso. Senha errada vem como `CREDENCIAIS_INVALIDAS` e não derruba a sessão.
- `409` na retirada: a mensagem da procedure aparece seguida de "Nada foi gravado.", porque a operação é tudo ou nada.
- Falha de rede: "Não foi possível falar com o servidor", com o botão Tentar novamente.

### Segurança

- O token fica em `sessionStorage` e some ao fechar a aba. Nenhum segredo fica no front.
- Todo texto vindo da API passa por `esc()` antes de entrar no HTML, como proteção contra XSS.
- O front nunca acessa o MySQL, só a API, que usa o usuário `app_videoteca`.

## 5. Como alterar

- **Endereço da API ou botões de login rápido:** constantes no início de `js/api.js`.
- **Nova rota:** acrescente uma função no objeto `API` (`api.js`) e chame em `app.js`.
- **Nova tela:** crie uma função assíncrona que devolve o HTML (modelo: `paginaUsuarios`), registre em `PAGES` e inclua em `NAV` para os perfis que podem vê-la.
- **Quem vê o quê:** edite `NAV`. A API também deixa o ADMIN registrar retiradas e devoluções; o front deixou isso só com o ATENDENTE, conforme as regras de negócio.
- **Visual:** cores e tema no bloco `:root` de `css/estilos.css`.

## 6. Roteiro de teste

Vale para o banco real e para o modo demonstração. Senha de todas as contas: `123456`.

| Conta | O que verificar |
|---|---|
| `socio1@videoteca.com` | Vê só o catálogo e os próprios empréstimos; menu sem telas de gestão |
| `limite@videoteca.com` | Mostra "3 de 3"; se houver atraso, aparece a multa prevista |
| `inativo@videoteca.com` | Login recusado com mensagem |
| `atendente@videoteca.com` | Retirada para um sócio comum funciona; para `USR-00003` (inativo) e `USR-00004` (no limite) aparece a recusa com "Nada foi gravado."; devolução com confirmação e multa |
| `admin@videoteca.com` | Cadastrar usuário (senha com 8 ou mais caracteres), e-mail repetido dá erro, inativar e reativar; não consegue inativar a própria conta |

Também vale testar a busca pelo início do título, o filtro de gênero, "Só disponíveis", a paginação e a mensagem de conexão quando a API cai.

## 7. Limitações conhecidas

O front usa apenas o que a API oferece. Por decisão de escopo e de segurança, a aplicação não tem:

1. **Histórico de empréstimos devolvidos.** A aplicação só enxerga a `vw_emprestimos_ativos`, então não há tela de histórico.
2. **Gestão do acervo.** Não há rotas para cadastrar filme, alterar o total de fitas ou cadastrar gênero. A tela Acervo é só de consulta.
3. **Lista de gêneros vinda do banco.** O filtro é montado a partir dos filmes do catálogo.
4. **Busca por código de catálogo.** A busca é pelo início do título, e o front avisa isso no campo.
