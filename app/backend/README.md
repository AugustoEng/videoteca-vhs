# Back-end — Lógica Interna (Erick)

Implementação do tópico **Back-end / Lógica Interna** do projeto acadêmico *Videoteca VHS* da UCB, preparada com base no repositório `AugustoEng/videoteca-vhs` (branch `main`, consultado em 11/11/2026).

## Organização

```text
app/backend/
├── demo.env                  # Configuração APENAS para demonstração local
├── .env.example               # Modelo sem segredo real
├── package.json
├── README.md                  # Este guia
├── CONTRATO_REPOSITORIO.md    # Handoff para Christopher
├── src/
│   ├── api.js                 # Rotas HTTP para Davi
│   ├── servidor.js            # Inicialização da API
│   ├── servico.js             # Regras e casos de uso (Erick)
│   ├── validacao.js           # Validação de entradas
│   ├── erros.js               # Erros padronizados
│   ├── token.js               # Autenticação e sessão
│   └── repositorio-demo.js    # Dados simulados, sem MySQL
└── tests/
    └── servico.test.js        # Testes automatizados
```

**Importante:** apenas a camada de lógica e API está implementada aqui. A integração MySQL (Christopher) e a interface HTML/CSS/JS (Davi) são partes separadas. O código já oferece a **consulta da view `vw_catalogo` e a entidade `usuarios` pela API**, mas isso só consultará MySQL depois de adicionado o adaptador de Christopher; no modo demonstração, os dados são simulados em memória.

## O que foi implementado

- Login por e-mail/senha, com hash SHA-256 compatível com o banco atual.
- Token Bearer assinado, expira em 2 horas, e verificação de usuário ativo a cada requisição.
- Permissões por grupo: `ADMIN`, `ATENDENTE`, `SOCIO`.
- Catálogo com busca por início do título, gênero, somente disponíveis, paginação.
- Consulta à view de empréstimos ativos; sócios veem somente os próprios.
- Listagem de usuários por administradores e atendentes; cadastro, ativação e desativação reservados ao administrador.
- Empréstimos e devoluções orquestrados pelas procedures já existentes no banco.
- Validação de entradas, mensagens legíveis, proteção contra exposição de `senha_hash`.
- API HTTP em Node.js, sem pacotes externos para a camada de lógica.
- Testes automatizados usando `node:test` e repositório em memória.

## Iniciar a demonstração — sem MySQL

Requer **Node.js 20 ou superior**:

```bash
cd app/backend
npm run dev:demo
```

A API abrirá em `http://localhost:3001`. Não é necessário instalar bibliotecas adicionais para o modo demonstração. **Nunca use DEMO_MODE=1 em ambiente público.**

Usuários de demonstração, com senha `123456`:

| E-mail | Grupo | Situação |
|---|---|---|
| `admin@videoteca.com` | ADMIN | Ativo |
| `atendente@videoteca.com` | ATENDENTE | Ativo |
| `socio1@videoteca.com` | SOCIO | Ativo |
| `limite@videoteca.com` | SOCIO | Já possui 3 fitas |
| `inativo@videoteca.com` | SOCIO | Inativo |

A demonstração **não** usa os ~20 mil empréstimos aleatórios do banco real. As alterações em memória se perdem ao reiniciar o servidor.

## Testar

```bash
cd app/backend
npm test
```

## Endpoints para Davi

| Método | Rota | Permissões | Descrição |
|---|---|---|---|
| `GET` | `/api/saude` | Pública | Verificar que o servidor responde |
| `POST` | `/api/auth/login` | Pública | Autenticação |
| `GET` | `/api/auth/me` | Qualquer usuário ativo | Perfil atual |
| `GET` | `/api/catalogo` | Todos | Lista da view `vw_catalogo` |
| `GET` | `/api/emprestimos` | Todos* | View `vw_emprestimos_ativos` |
| `POST` | `/api/emprestimos` | ADMIN / ATENDENTE | Chama `sp_emprestar` |
| `POST` | `/api/emprestimos/:id/devolucao` | ADMIN / ATENDENTE | Chama `sp_devolver` |
| `GET` | `/api/usuarios` | ADMIN / ATENDENTE | Lista a entidade `usuarios` (sem senha) |
| `POST` | `/api/usuarios` | ADMIN | Cadastra usuário |
| `PATCH` | `/api/usuarios/:id/status` | ADMIN | Ativa/desativa usuário |
| `GET` | `/api/grupos` | ADMIN | Consulta grupos |

*Sócios veem exclusivamente os seus próprios empréstimos, independentemente de filtros enviados.*

### Login

```http
POST /api/auth/login
Content-Type: application/json

{"email":"admin@videoteca.com","senha":"123456"}
```

A resposta tem `{ "token": "...", "tipo": "Bearer", "expiraEmSegundos": 7200, "usuario": { ... } }`. Para as demais operações, enviar o cabeçalho `Authorization: Bearer <token>`.

### Consultar a view de catálogo

```http
GET /api/catalogo?busca=Mat&genero=Fic%C3%A7%C3%A3o%20Cient%C3%ADfica&disponiveis=true&pagina=1&limite=20
Authorization: Bearer <token>
```

Resposta: `{ "itens": [{ "id_filme": 2, "titulo": "Matrix", "genero": "Ficção Científica", "qtd_disponivel": 3, ... }], "total": 1, "pagina": 1, "limite": 20 }`.

### Consultar entidade usuários

```http
GET /api/usuarios
Authorization: Bearer <token ADMIN ou ATENDENTE>
```

Resposta: `{ "itens": [{ "idUsuario": "USR-00001", "nome": "Administrador", "email": "admin@videoteca.com", "ativo": true, "idGrupo": 1, "grupo": "ADMIN" }, ...], "total": 5 }`. Nenhuma resposta inclui `senha_hash`.

### Emprestar

```http
POST /api/emprestimos
Authorization: Bearer <token ADMIN ou ATENDENTE>
Content-Type: application/json

{"idUsuario":"USR-00005","idFilme":4}
```

O backend valida formato/identidade/permissões; `sp_emprestar` verifica disponibilidade e limite, gera ID e prazo, diminui o estoque e efetua `COMMIT`/`ROLLBACK`.

### Devolver

```http
POST /api/emprestimos/EMP-2026-00004/devolucao
Authorization: Bearer <token ADMIN ou ATENDENTE>
```

A procedure `sp_devolver` registra a devolução, multa e atualização do estoque. Para mostrar a multa antes da confirmação, consultar `GET /api/emprestimos` e apresentar `multa_prevista`.

### Cadastrar usuário

```http
POST /api/usuarios
Authorization: Bearer <token ADMIN ou ATENDENTE>
Content-Type: application/json

{"nome":"Novo Sócio","email":"novo@exemplo.com","senha":"minhaSenhaForte123","idGrupo":3}
```

O campo `idUsuario` não deve ser enviado: o banco gera o ID por trigger. Login de contas já criadas no SQL continua usando a senha existente de teste.

### Ativar/desativar

```http
PATCH /api/usuarios/USR-00005/status
Authorization: Bearer <token ADMIN ou ATENDENTE>
Content-Type: application/json

{"ativo":false}
```

### Respostas de erro

```json
{"erro":"REGRA_NEGOCIO","mensagem":"Limite de 3 fitas em aberto atingido"}
```

Códigos comuns: `400` dados inválidos, `401` autenticação, `403` sem permissão, `404` inexistente, `409` conflito/regra de negócio, `500` falha interna.

## Integração real com MySQL

1. Executar os scripts SQL do repositório original na sequência indicada em `bd/README.md`.
2. O Christopher adiciona o adaptador em `src/repositorios/mysql-repository.js`, implementando o contrato em [CONTRATO_REPOSITORIO.md](CONTRATO_REPOSITORIO.md).
3. Copiar `.env.example` para `.env` dentro de `app/backend/`, definir uma senha de banco específica da aplicação, `AUTH_SECRET` forte e `DEMO_MODE` ausente.
4. Executar `npm start` na pasta `app/backend/`. O script executa `node --env-file=.env src/servidor.js` e carrega as variáveis do arquivo `.env` automaticamente (Node.js 20+). O servidor não deve utilizar o usuário `root`.
5. O Davi integra o front-end por `fetch()` nas rotas acima e usa o token Bearer após o login.
6. O Guilherme executa os testes automatizados e um roteiro manual sobre o MySQL real.

**Observação de segurança:** o projeto SQL original usa SHA-256 sem salt para senhas e geradores sequenciais de ID. É uma opção acadêmica legada. Para produção, adotar senhas com Argon2id/bcrypt e revisar concorrência na geração de IDs e na verificação do limite de empréstimos. Essas mudanças exigem coordenação com o banco e estão fora do escopo isolado da lógica interna.
