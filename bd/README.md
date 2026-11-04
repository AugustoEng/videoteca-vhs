# Banco de dados - Videoteca VHS

Scripts de criação do banco `videoteca`, usado pelo sistema de empréstimo de fitas VHS.
Os scripts devem ser executados na ordem numérica, cada um com o usuário indicado.

## Requisitos

- MySQL Community Server 8.0.16 ou superior (recomendado: 8.4 LTS)
- MySQL Workbench ou o cliente de linha de comando `mysql`

## Ordem de execução

| Ordem | Script               | Usuário         | O que faz                                                                  |
|-------|----------------------|-----------------|----------------------------------------------------------------------------|
| 1     | `00_admin.sql`       | root            | Cria o usuário `admin_videoteca` e concede suas permissões                 |
| 2     | `01_ddl.sql`         | admin_videoteca | Apaga e recria o banco `videoteca` com as 5 tabelas e restrições           |
| 3     | `02_functions.sql`   | admin_videoteca | Cria as functions de geração de IDs e de cálculo de multa                  |
| 4     | `03_triggers.sql`    | admin_videoteca | Cria os triggers de geração de IDs, prazo de devolução e controle de estoque |
| 5     | `04_procedures.sql`  | admin_videoteca | Cria as procedures de empréstimo e devolução, com controle de transação    |
| 6     | `05_views.sql`       | admin_videoteca | Cria as views do catálogo e dos empréstimos ativos                         |
| 7     | `06_indices.sql`     | admin_videoteca | Cria os índices de apoio às consultas                                      |
| 8     | `07_acesso.sql`      | admin_videoteca | Cria as roles e os usuários da aplicação e de relatório                    |
| 9     | `08_dados_teste.sql` | admin_videoteca | Carrega os dados de teste                                                  |

## Como executar

### Pelo MySQL Workbench

1. Abra uma conexão com o usuário `root`.
2. Abra o arquivo `00_admin.sql` e execute o script inteiro.
3. Crie uma nova conexão com o usuário `admin_videoteca` e a senha definida no `00_admin.sql`.
4. Nessa conexão, abra e execute os scripts de `01_ddl.sql` a `08_dados_teste.sql`, um de cada vez e na ordem.

### Pela linha de comando

Execute a partir desta pasta:

```
mysql -u root -p < 00_admin.sql
mysql -u admin_videoteca -p < 01_ddl.sql
mysql -u admin_videoteca -p < 02_functions.sql
mysql -u admin_videoteca -p < 03_triggers.sql
mysql -u admin_videoteca -p < 04_procedures.sql
mysql -u admin_videoteca -p < 05_views.sql
mysql -u admin_videoteca -p < 06_indices.sql
mysql -u admin_videoteca -p < 07_acesso.sql
mysql -u admin_videoteca -p < 08_dados_teste.sql
```

## Recriar o banco do zero

O `01_ddl.sql` apaga e recria o banco `videoteca`. Para voltar ao estado inicial, ou para refazer qualquer script, execute novamente todos os scripts a partir do `01_ddl.sql`, na ordem.

O `00_admin.sql` é executado apenas uma vez por máquina. Para refazê-lo, remova antes o usuário com o root:

```
DROP USER 'admin_videoteca'@'localhost';
```

## Usuários do banco

| Usuário               | Senha inicial  | Acesso                                                                        |
|-----------------------|----------------|-------------------------------------------------------------------------------|
| `admin_videoteca`     | `Adm!nVhs2026` | Cria e mantém todos os objetos do banco `videoteca`                           |
| `app_videoteca`       | `App!Vhs2026`  | Usado pela aplicação: views, leitura de grupos, cadastro de usuários e procedures |
| `relatorio_videoteca` | `Rel!Vhs2026`  | Somente leitura das views                                                     |

## Dados de teste

O `08_dados_teste.sql` carrega 3 grupos, 8 gêneros, 401 filmes, 304 usuários e cerca de 20 mil empréstimos, dos quais cerca de 150 estão em aberto. Os títulos, nomes e datas são gerados aleatoriamente a cada execução. A senha de todos os usuários de teste é `123456`, armazenada com SHA2-256.

Registros fixos para demonstração:

| Registro                         | Situação                                  |
|----------------------------------|-------------------------------------------|
| `USR-00001` Administrador        | Grupo ADMIN                               |
| `USR-00002` Atendente            | Grupo ATENDENTE                           |
| `USR-00003` Sócio Inativo        | Usuário inativo, não pode retirar fitas   |
| `USR-00004` Sócio no Limite      | Já possui 3 fitas em aberto               |
| Filme 1 `VHS-0001` Fita Única    | Nenhuma fita disponível                   |

## Verificação

Conectado como `admin_videoteca`:

```
SELECT CURRENT_USER();
SHOW TABLES FROM videoteca;
SHOW FUNCTION STATUS WHERE Db = 'videoteca';
SHOW PROCEDURE STATUS WHERE Db = 'videoteca';
SHOW TRIGGERS FROM videoteca;
```

Conectado como `app_videoteca`:

```
SELECT CURRENT_USER();
SHOW GRANTS;
SELECT COUNT(*) FROM videoteca.vw_catalogo;
```

## Observações

- O usuário root é usado apenas no `00_admin.sql`. A aplicação nunca se conecta ao banco como root.
- Troque as senhas no `00_admin.sql` e no `07_acesso.sql` antes da primeira execução.
- Se o MySQL estiver rodando em Docker, substitua `'localhost'` por `'%'` no `00_admin.sql` e no `07_acesso.sql` para permitir a conexão de fora do container.
