# Banco de dados - Videoteca VHS

Scripts de criação do banco `videoteca`, usado pelo sistema de empréstimo de fitas VHS.
Os scripts devem ser executados na ordem numérica, cada um com o usuário indicado.

## Requisitos

- MySQL Community Server 8.0.16 ou superior (recomendado: 8.4 LTS)
- MySQL Workbench ou o cliente de linha de comando `mysql`

## Ordem de execução

| Ordem | Script             | Usuário         | O que faz                                                        |
|-------|--------------------|-----------------|------------------------------------------------------------------|
| 1     | `00_admin.sql`     | root            | Cria o usuário `admin_videoteca` e concede suas permissões       |
| 2     | `01_ddl.sql`       | admin_videoteca | Apaga e recria o banco `videoteca` com as 5 tabelas e restrições |
| 3     | `02_functions.sql` | admin_videoteca | Cria as functions de geração de IDs e de cálculo de multa        |

Os próximos scripts seguem a mesma numeração (`03_triggers.sql`, `04_procedures.sql`...) e também são executados com o `admin_videoteca`.

## Como executar

### Pelo MySQL Workbench

1. Abra uma conexão com o usuário `root`.
2. Abra o arquivo `00_admin.sql` e execute o script inteiro.
3. Crie uma nova conexão com o usuário `admin_videoteca` e a senha definida no `00_admin.sql`.
4. Nessa conexão, abra e execute `01_ddl.sql` e depois `02_functions.sql`.

### Pela linha de comando

Execute a partir desta pasta:

```
mysql -u root -p < 00_admin.sql
mysql -u admin_videoteca -p < 01_ddl.sql
mysql -u admin_videoteca -p < 02_functions.sql
```

## Recriar o banco do zero

O `01_ddl.sql` apaga e recria o banco `videoteca`. Para voltar ao estado inicial, execute novamente todos os scripts a partir do `01_ddl.sql`, na ordem.

O `00_admin.sql` é executado apenas uma vez por máquina. Para refazê-lo, remova antes o usuário com o root:

```
DROP USER 'admin_videoteca'@'localhost';
```

## Verificação

Conectado como `admin_videoteca`:

```
SELECT CURRENT_USER();
SHOW TABLES FROM videoteca;
SHOW FUNCTION STATUS WHERE Db = 'videoteca';
```

O resultado esperado é o usuário `admin_videoteca@localhost`, as tabelas `emprestimos`, `filmes`, `generos`, `grupos_usuarios` e `usuarios`, e as functions `fn_calcular_multa`, `fn_novo_id_emprestimo` e `fn_novo_id_usuario`.

## Observações

- O usuário root é usado apenas no `00_admin.sql`. A aplicação nunca se conecta ao banco como root.
- Troque a senha do `admin_videoteca` no `00_admin.sql` antes da primeira execução.
- Se o MySQL estiver rodando em Docker, substitua `'localhost'` por `'%'` no `00_admin.sql` para permitir a conexão de fora do container.
