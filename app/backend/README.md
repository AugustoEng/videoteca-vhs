# Back-end da Videoteca VHS

API em Node.js que conecta a interface web ao banco MySQL `videoteca`. Ela autentica os usuários, aplica as permissões de cada grupo e consulta as views e as procedures do banco, sempre com o usuário `app_videoteca`.

- Lógica interna e API: Erick Teixeira dos Santos
- Adaptador MySQL: Christopher Almeida do Nascimento

## Organização

```text
app/backend/
├── .env.example               Modelo de configuração, sem senhas reais
├── demo.env                   Configuração do modo demonstração, sem MySQL
├── package.json
├── package-lock.json
├── README.md                  Este guia
├── CONTRATO_REPOSITORIO.md    Contrato entre a lógica interna e o adaptador de dados
├── src/
│   ├── servidor.js            Inicialização da API
│   ├── api.js                 Rotas HTTP
│   ├── servico.js             Regras e casos de uso
│   ├── validacao.js           Validação das entradas
│   ├── erros.js               Erros padronizados e tradução das mensagens do MySQL
│   ├── token.js               Autenticação e sessão
│   ├── repositorio-demo.js    Dados simulados em memória, para o modo demonstração
│   └── repositorios/
│       └── mysql-repository.js  Adaptador MySQL
└── tests/
    └── servico.test.js        Testes automatizados
```

## O que foi implementado

- Login por e-mail e senha, com hash SHA-256 compatível com o banco.
- Token Bearer assinado, com validade de 2 horas e verificação de usuário ativo a cada requisição.
- Permissões por grupo: `ADMIN`, `ATENDENTE` e `SOCIO`.
- Catálogo pela view `vw_catalogo`, com busca pelo início do título, filtro de gênero, somente disponíveis e paginação.
- Empréstimos em aberto pela view `vw_emprestimos_ativos`. O sócio vê apenas os próprios.
- Listagem de usuários para administradores e atendentes. Cadastro, ativação e desativação reservados ao administrador.
- Retiradas e devoluções pelas procedures `sp_emprestar` e `sp_devolver`, que controlam a transação no banco.
- Adaptador MySQL com o driver `mysql2`: pool de conexões, consultas sempre parametrizadas e conexão recusada se o usuário configurado for `root`.
- Validação de todas as entradas, mensagens legíveis e nenhuma resposta com `senha_hash`.
- Testes automatizados com `node:test`.

## Como rodar com o MySQL

Requer Node.js 20.6 ou superior e o banco criado conforme o [`bd/README.md`](../../bd/README.md).

```bash
cd app/backend
npm install
cp .env.example .env
npm start
```

No `.env`, preencha:

| Variável      | Valor                                                     |
|---------------|-----------------------------------------------------------|
| `DB_PASSWORD` | Senha do usuário `app_videoteca`, definida no `07_acesso.sql` |
| `AUTH_SECRET` | Texto aleatório com pelo menos 32 caracteres              |

O `npm start` executa `node --env-file=.env src/servidor.js`. A API abre em `http://localhost:3001` e confirma a conexão com o banco ao iniciar.

## Modo demonstração, sem MySQL

```bash
cd app/backend
npm run dev:demo
```

Os dados ficam em memória e se perdem ao reiniciar o servidor. Nunca use este modo em ambiente público.

## Contas de teste

As mesmas contas existem no banco real e no modo demonstração, todas com a senha `123456`:

| E-mail                    | Grupo     | Situação                    |
|---------------------------|-----------|-----------------------------|
| `admin@videoteca.com`     | ADMIN     | Ativo                       |
| `atendente@videoteca.com` | ATENDENTE | Ativo                       |
| `socio1@videoteca.com`    | SOCIO     | Ativo                       |
| `limite@videoteca.com`    | SOCIO     | Já possui 3 fitas em aberto |
| `inativo@videoteca.com`   | SOCIO     | Inativo                     |

## Testar

```bash
cd app/backend
npm test
```

## Rotas

| Método  | Rota                             | Permissões             | Descrição                                   |
|---------|----------------------------------|------------------------|---------------------------------------------|
| `GET`   | `/api/saude`                     | Pública                | Verifica se o servidor responde             |
| `POST`  | `/api/auth/login`                | Pública                | Autenticação                                |
| `GET`   | `/api/auth/me`                   | Qualquer usuário ativo | Perfil atual                                |
| `GET`   | `/api/catalogo`                  | Todos                  | Lista da view `vw_catalogo`                 |
| `GET`   | `/api/emprestimos`               | Todos*                 | Lista da view `vw_emprestimos_ativos`       |
| `POST`  | `/api/emprestimos`               | ADMIN e ATENDENTE      | Chama `sp_emprestar`                        |
| `POST`  | `/api/emprestimos/:id/devolucao` | ADMIN e ATENDENTE      | Chama `sp_devolver`                         |
| `GET`   | `/api/usuarios`                  | ADMIN e ATENDENTE      | Lista a entidade `usuarios`, sem a senha    |
| `POST`  | `/api/usuarios`                  | ADMIN                  | Cadastra usuário                            |
| `PATCH` | `/api/usuarios/:id/status`       | ADMIN                  | Ativa ou desativa usuário                   |
| `GET`   | `/api/grupos`                    | ADMIN                  | Lista os grupos                             |

*O sócio vê apenas os próprios empréstimos, independentemente dos filtros enviados.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{"email":"admin@videoteca.com","senha":"123456"}
```

A resposta traz `{ "token": "...", "tipo": "Bearer", "expiraEmSegundos": 7200, "usuario": { ... } }`. As demais rotas exigem o cabeçalho `Authorization: Bearer <token>`.

### Consultar o catálogo

```http
GET /api/catalogo?busca=O%20F&genero=Terror&disponiveis=true&pagina=1&limite=20
Authorization: Bearer <token>
```

Resposta: `{ "itens": [ { "id_filme": 12, "titulo": "...", "genero": "Terror", "qtd_disponivel": 2, ... } ], "total": 9, "pagina": 1, "limite": 20 }`.

### Listar usuários

```http
GET /api/usuarios
Authorization: Bearer <token ADMIN ou ATENDENTE>
```

Resposta: `{ "itens": [ { "idUsuario": "USR-00001", "nome": "Administrador", "email": "admin@videoteca.com", "ativo": true, "idGrupo": 1, "grupo": "ADMIN" }, ... ], "total": 304 }`.

### Registrar retirada

```http
POST /api/emprestimos
Authorization: Bearer <token ADMIN ou ATENDENTE>
Content-Type: application/json

{"idUsuario":"USR-00005","idFilme":4}
```

A API confere o formato, o usuário e as permissões. A `sp_emprestar` confere o estoque e o limite de 3 fitas, gera o código e o prazo, baixa o estoque e faz `COMMIT` ou `ROLLBACK`.

### Registrar devolução

```http
POST /api/emprestimos/EMP-2026-00004/devolucao
Authorization: Bearer <token ADMIN ou ATENDENTE>
```

A `sp_devolver` registra a devolução e a multa e devolve a fita ao estoque. Para mostrar a multa antes da confirmação, use o campo `multa_prevista` de `GET /api/emprestimos`.

### Cadastrar usuário

```http
POST /api/usuarios
Authorization: Bearer <token ADMIN>
Content-Type: application/json

{"nome":"Novo Sócio","email":"novo@exemplo.com","senha":"minhaSenhaForte123","idGrupo":3}
```

O `idUsuario` não é enviado: o banco gera o código por trigger.

### Ativar ou desativar

```http
PATCH /api/usuarios/USR-00005/status
Authorization: Bearer <token ADMIN>
Content-Type: application/json

{"ativo":false}
```

### Respostas de erro

```json
{"erro":"REGRA_NEGOCIO","mensagem":"Limite de 3 fitas em aberto atingido"}
```

Códigos usados: `400` dados inválidos, `401` não autenticado, `403` sem permissão, `404` não encontrado, `409` conflito ou regra de negócio, `500` falha interna.

## Observação de segurança

O banco guarda as senhas com SHA-256 sem salt, uma escolha acadêmica. Em produção, o recomendado seria Argon2id ou bcrypt.
