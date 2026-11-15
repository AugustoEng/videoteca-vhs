# Videoteca VHS

Sistema de empréstimo de fitas VHS com banco de dados MySQL: modelagem conceitual, lógica e física, functions, triggers, procedures, views, índices, controle de transações e controle de acesso por usuários e grupos.

## Informações acadêmicas

| Campo           | Informação                        |
|-----------------|-----------------------------------|
| Instituição     | Universidade Católica de Brasília |
| Curso           | Engenharia de Software            |
| Disciplina      | Laboratório de Banco de Dados     |
| Professor       | Jefferson Salomão Rodrigues       |
| Turma/Semestre  | 4° Semestre                       |
| Data de entrega | 15/11/2026                        |

## Integrantes

- Camilla Silva Mesquita de Miranda
- Christopher Almeida do Nascimento
- Davi Gabriel Ramos Pereira
- Erick Teixeira dos Santos
- Guilherme Augusto dos Santos

## Sobre o projeto

O sistema controla o acervo e os empréstimos de uma videoteca. Cada usuário pertence a um grupo (administrador, atendente ou sócio), que define o que ele pode fazer no sistema. Os filmes são classificados por gênero e podem ter várias fitas. Cada empréstimo liga um sócio a um filme e registra a retirada, o prazo de devolução, a devolução e a multa por atraso, quando houver.

### Funcionalidades

- Login por e-mail e senha, com telas diferentes para administrador, atendente e sócio
- Catálogo de filmes com busca por título, filtro por gênero e quantidade de fitas disponíveis
- Cadastro, ativação e desativação de usuários
- Retirada e devolução de fitas, com atualização automática do estoque
- Limite de 3 fitas em aberto por sócio e prazo de devolução de 3 dias
- Cálculo de multa por dia de atraso, exibida antes da devolução
- Acesso ao banco por usuários com permissões específicas, sem uso do root

## Tecnologias

| Camada                 | Tecnologia                                            |
|------------------------|-------------------------------------------------------|
| Banco de dados         | MySQL 8.4 LTS                                         |
| Administração do banco | MySQL Workbench                                       |
| Modelagem              | draw.io                                               |
| Backend                | Node.js 20 (módulo `http` nativo) com o driver `mysql2` |
| Frontend               | HTML, CSS e JavaScript, sem frameworks                |
| Testes                 | `node:test`                                           |
| Versionamento          | Git e GitHub                                          |

## Estrutura do repositório

```
.
├── README.md
├── .gitignore
├── bd/              scripts SQL do banco, executados em ordem numérica
├── app/
│   ├── backend/     API em Node.js que se comunica com o MySQL
│   └── frontend/    interface web em HTML, CSS e JavaScript
└── docs/            regras de negócio, modelos e dicionário de dados
```

## Modelagem

A modelagem seguiu a ordem: regras de negócio, modelo conceitual, modelo lógico e modelo físico.

| Etapa               | Arquivo                                   |
|---------------------|-------------------------------------------|
| Regras de negócio   | `docs/regras_de_negocio.xlsx`             |
| Modelo conceitual   | `docs/modelos.drawio` (página Conceitual) |
| Relacionamentos     | `docs/relacionamentos.xlsx`               |
| Modelo lógico       | `docs/modelos.drawio` (página Lógico)     |
| Modelo físico       | `bd/01_ddl.sql`                           |
| Dicionário de dados | `docs/dicionario_de_dados.xlsx`           |

## Recursos do banco de dados

| Recurso                | Script                  |
|------------------------|-------------------------|
| Usuário administrador  | `bd/00_admin.sql`       |
| Tabelas e restrições   | `bd/01_ddl.sql`         |
| Functions              | `bd/02_functions.sql`   |
| Triggers               | `bd/03_triggers.sql`    |
| Procedures e TCL       | `bd/04_procedures.sql`  |
| Views                  | `bd/05_views.sql`       |
| Índices                | `bd/06_indices.sql`     |
| Controle de acesso     | `bd/07_acesso.sql`      |
| Dados de teste         | `bd/08_dados_teste.sql` |

## Como executar

### 1. Banco de dados

Siga as instruções em [`bd/README.md`](bd/README.md). O uso do banco pela aplicação está descrito em [`bd/INTEGRACAO.md`](bd/INTEGRACAO.md).

### 2. Backend

Requer Node.js 20.6 ou superior.

```
cd app/backend
npm install
cp .env.example .env
npm start
```

No `.env`, preencha `DB_PASSWORD` com a senha do usuário `app_videoteca` e `AUTH_SECRET` com um texto aleatório de pelo menos 32 caracteres. A API abre em `http://localhost:3001`. Detalhes em [`app/backend/README.md`](app/backend/README.md).

### 3. Frontend

Em outro terminal:

```
cd app/frontend
python -m http.server 5173
```

Abra `http://localhost:5173`. Detalhes em [`app/frontend/README.md`](app/frontend/README.md).

### Contas de teste

Todas com a senha `123456`:

| E-mail                    | Grupo     | Situação                    |
|---------------------------|-----------|-----------------------------|
| `admin@videoteca.com`     | ADMIN     | Ativo                       |
| `atendente@videoteca.com` | ATENDENTE | Ativo                       |
| `socio1@videoteca.com`    | SOCIO     | Ativo                       |
| `limite@videoteca.com`    | SOCIO     | Já possui 3 fitas em aberto |
| `inativo@videoteca.com`   | SOCIO     | Inativo                     |

Para testar a interface sem MySQL, use `npm run dev:demo` no lugar de `npm start`. Nesse modo os dados são simulados em memória.
