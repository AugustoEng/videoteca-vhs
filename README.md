# Videoteca VHS

Sistema de empréstimo de fitas VHS com banco de dados MySQL: modelagem conceitual, lógica e física, functions, triggers, procedures, views, índices, controle de transações e controle de acesso por usuários e grupos.

## Informações acadêmicas

| Campo           | Informação                       |
|-----------------|----------------------------------|
| Instituição     | Universidade Ctólica de Brasília |
| Curso           | Engenharia de Software           |
| Disciplina      | Laboratório de Banco de Dados    |
| Professor       | Jefferson Salomão Rodrigues      |
| Turma/Semestre  | 4° Semestre                      |
| Data de entrega | 15/11/2026                       |

## Integrantes

| Nome                              | Matrícula   |
|-----------------------------------|-------------|
| Camilla Silva Mesquita de Miranda | [preencher] |
| Christopher Almeida do Nascimento | [preencher] |
| Davi Gabriel Ramos Pereira        | [preencher] |
| Erick Teixeira dos Santos         | [preencher] |
| Guilherme Augusto dos Santos      | UC25100900  |

## Sobre o projeto

O sistema controla o acervo e os empréstimos de uma videoteca. Cada usuário pertence a um grupo (administrador, atendente ou sócio), que define o que ele pode fazer no sistema. Os filmes são classificados por gênero e podem ter várias fitas. Cada empréstimo liga um sócio a um filme e registra a retirada, o prazo de devolução, a devolução e a multa por atraso, quando houver.

### Funcionalidades

- Cadastro de usuários e grupos de usuários
- Catálogo de filmes por gênero, com quantidade de fitas disponíveis
- Empréstimo e devolução de fitas, com atualização automática do estoque
- Limite de 3 fitas em aberto por sócio e prazo de devolução de 3 dias
- Cálculo de multa por dia de atraso
- Acesso ao banco por usuários com permissões específicas, sem uso do root

## Tecnologias

| Camada                 | Tecnologia            |
|------------------------|-----------------------|
| Banco de dados         | MySQL 8.4 LTS         |
| Administração do banco | MySQL Workbench       |
| Modelagem              | draw.io               |
| Backend                | [preencher]           |
| Frontend               | [preencher]           |
| Versionamento          | Git e GitHub          |

## Estrutura do repositório

```
.
├── README.md
├── .gitignore
├── bd/      scripts SQL do banco, executados em ordem numérica
├── app/     código da aplicação
└── docs/    regras de negócio, modelos e artigo
```

## Modelagem

A modelagem seguiu a ordem conceitual, lógico e físico, registrada no histórico de commits e nas tags de cada etapa.

| Etapa             | Arquivo                                   |
|-------------------|-------------------------------------------|
| Regras de negócio | `docs/regras_de_negocio.xlsx`             |
| Modelo conceitual | `docs/modelos.drawio` (página Conceitual) |
| Modelo lógico     | `docs/modelos.drawio` (página Lógico)     |
| Modelo físico     | `bd/01_ddl.sql`                           |

## Recursos do banco de dados

| Recurso                | Script                 |
|------------------------|------------------------|
| Usuário administrador  | `bd/00_admin.sql`      |
| Tabelas e restrições   | `bd/01_ddl.sql`        |
| Functions              | `bd/02_functions.sql`  |
| Triggers               | `bd/03_triggers.sql`   |
| Procedures e TCL       | `bd/04_procedures.sql` |
| Views                  | `bd/05_views.sql`      |
| Índices                | `bd/06_indices.sql`    |
| Controle de acesso     | `bd/07_acesso.sql`     |
| Dados de teste         | `bd/08_dados_teste.sql`|

## Como executar

### Banco de dados

Siga as instruções em ["bd/README.md`](bd/README.md).

## Documentação

- Artigo: [preencher]
- Apresentação: [preencher]
