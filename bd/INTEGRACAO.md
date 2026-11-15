# Integração com a aplicação - Videoteca VHS

O que a aplicação pode usar do banco `videoteca` e como usar.
Este arquivo deve ser atualizado no mesmo commit de qualquer mudança em views, procedures ou permissões.

## Conexão

| Campo         | Valor           |
|---------------|-----------------|
| Host          | `localhost`     |
| Porta         | `3306`          |
| Banco         | `videoteca`     |
| Usuário       | `app_videoteca` |
| Senha inicial | `App!Vhs2026`   |

A aplicação se conecta somente com o `app_videoteca`. O root e o `admin_videoteca` nunca são usados pela aplicação.

Os dados de conexão ficam no arquivo `.env` da pasta `app/`, que não vai para o GitHub. O repositório leva apenas o `.env.example`:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=videoteca
DB_USER=app_videoteca
DB_PASSWORD=
```

## Permissões da aplicação

| Objeto                  | Permissão             | Uso na aplicação                                     |
|-------------------------|-----------------------|------------------------------------------------------|
| `vw_catalogo`           | SELECT                | Tela Catálogo e lista de filmes no empréstimo        |
| `vw_emprestimos_ativos` | SELECT                | Tela Empréstimos ativos e escolha da devolução       |
| `usuarios`              | SELECT, INSERT, UPDATE | Tela Usuários: listar, cadastrar, ativar e desativar |
| `grupos_usuarios`       | SELECT                | Lista de grupos no cadastro e permissões das telas   |
| `sp_emprestar`          | EXECUTE               | Registrar empréstimo                                 |
| `sp_devolver`           | EXECUTE               | Registrar devolução                                  |

A aplicação não tem permissão para:

- apagar registros (DELETE) em nenhuma tabela;
- ler ou alterar diretamente as tabelas `filmes`, `generos` e `emprestimos`;
- alterar a estrutura do banco (CREATE, ALTER, DROP).

Empréstimos e devoluções são feitos somente pelas procedures. O banco já garante o limite de 3 fitas, o estoque, o prazo de devolução e a multa. A aplicação não precisa refazer essas regras, apenas mostrar as mensagens que o banco devolve.

## Views

### vw_catalogo

| Coluna            | Tipo         | Descrição                       |
|-------------------|--------------|---------------------------------|
| `id_filme`        | INT          | Identificador do filme          |
| `codigo_catalogo` | VARCHAR(20)  | Código da caixa, ex.: VHS-0001  |
| `titulo`          | VARCHAR(150) | Título do filme                 |
| `diretor`         | VARCHAR(100) | Diretor                         |
| `ano_lancamento`  | YEAR         | Ano de lançamento               |
| `genero`          | VARCHAR(50)  | Nome do gênero                  |
| `qtd_total`       | INT          | Total de fitas do título        |
| `qtd_disponivel`  | INT          | Fitas disponíveis para retirada |

Busca por título:

```
SELECT * FROM vw_catalogo WHERE titulo LIKE 'O Farol%';
```

Use a busca por "começa com" (`'texto%'`). Com o `%` também no início (`'%texto%'`), o MySQL não usa o índice `idx_filmes_titulo`.

### vw_emprestimos_ativos

Mostra apenas os empréstimos ainda não devolvidos.

| Coluna           | Tipo         | Descrição                                   |
|------------------|--------------|---------------------------------------------|
| `id_emprestimo`  | CHAR(14)     | Código do empréstimo, ex.: EMP-2026-00001   |
| `id_usuario`     | CHAR(9)      | Código do sócio                             |
| `socio`          | VARCHAR(100) | Nome do sócio                               |
| `titulo`         | VARCHAR(150) | Título do filme retirado                    |
| `data_retirada`  | DATE         | Data da retirada                            |
| `data_prevista`  | DATE         | Prazo de devolução                          |
| `dias_atraso`    | INT          | Dias de atraso até hoje, 0 se no prazo      |
| `multa_prevista` | DECIMAL(6,2) | Multa se a fita for devolvida hoje          |

Somente os atrasados:

```
SELECT * FROM vw_emprestimos_ativos WHERE dias_atraso > 0 ORDER BY dias_atraso DESC;
```

## Usuários

Listagem, sem a coluna `senha_hash`:

```
SELECT id_usuario, nome, email, ativo, id_grupo FROM usuarios;
```

Cadastro, sem informar o `id_usuario`, que é gerado pelo trigger:

```
INSERT INTO usuarios (nome, email, senha_hash, id_grupo)
VALUES ('Nome do Sócio', 'email@exemplo.com', SHA2('senha', 256), 3);
```

- O `ativo` começa como TRUE.
- Um e-mail já cadastrado é recusado pelo banco (erro 1062, chave `uq_usuarios_email`).
- O ID gerado não é devolvido pelo INSERT. Para obtê-lo, consulte pelo e-mail: `SELECT id_usuario FROM usuarios WHERE email = 'email@exemplo.com';`

Login:

```
SELECT id_usuario, nome, id_grupo FROM usuarios
WHERE email = 'email@exemplo.com' AND senha_hash = SHA2('senha', 256) AND ativo = TRUE;
```

Ativar ou desativar:

```
UPDATE usuarios SET ativo = FALSE WHERE id_usuario = 'USR-00010';
```

### Grupos e telas

| id_grupo | Grupo     | O que a aplicação libera                       |
|----------|-----------|------------------------------------------------|
| 1        | ADMIN     | Todas as telas                                 |
| 2        | ATENDENTE | Catálogo, empréstimos ativos, emprestar e devolver |
| 3        | SOCIO     | Catálogo e os próprios empréstimos             |

Esse controle é feito pela aplicação. O banco controla apenas o que o usuário `app_videoteca` pode fazer.

## Procedures

As recusas das procedures chegam à aplicação como erro do MySQL, com código 1644 e SQLSTATE 45000. A mensagem do erro é o texto que deve aparecer na tela. Em qualquer recusa, nada é gravado.

### sp_emprestar

```
CALL sp_emprestar('USR-00010', 25);
```

| Parâmetro      | Tipo    | Descrição                |
|----------------|---------|--------------------------|
| `p_id_usuario` | CHAR(9) | Código do sócio          |
| `p_id_filme`   | INT     | Identificador do filme   |

Em caso de sucesso, o empréstimo é gravado com o código e o prazo gerados pelo banco, e o estoque do filme diminui em 1. A procedure não devolve dados: para mostrar o empréstimo criado, consulte a `vw_emprestimos_ativos`.

| Mensagem                                  | Quando acontece                          |
|-------------------------------------------|------------------------------------------|
| `Usuário não encontrado`                  | O código do usuário não existe           |
| `Usuário inativo`                         | O usuário está com `ativo = FALSE`       |
| `Filme não encontrado`                    | O identificador do filme não existe      |
| `Nenhuma fita disponível para este filme` | `qtd_disponivel` do filme é 0            |
| `Limite de 3 fitas em aberto atingido`    | O sócio já tem 3 fitas não devolvidas    |

### sp_devolver

```
CALL sp_devolver('EMP-2026-00001');
```

| Parâmetro         | Tipo     | Descrição              |
|-------------------|----------|------------------------|
| `p_id_emprestimo` | CHAR(14) | Código do empréstimo   |

Em caso de sucesso, a devolução é gravada com a data de hoje e a multa, e o estoque do filme aumenta em 1. A aplicação não lê a tabela `emprestimos`: para informar a multa, mostre a `multa_prevista` da `vw_emprestimos_ativos` antes de chamar a procedure. É o mesmo valor que será gravado.

| Mensagem                    | Quando acontece                     |
|-----------------------------|-------------------------------------|
| `Empréstimo não encontrado` | O código do empréstimo não existe   |
| `Empréstimo já devolvido`   | O empréstimo já tem devolução       |

## Casos de demonstração

Criados pelo `08_dados_teste.sql`. A senha de todos os usuários de teste é `123456`.

| Registro                      | Situação                                |
|-------------------------------|-----------------------------------------|
| `USR-00001` Administrador     | Grupo ADMIN                             |
| `USR-00002` Atendente         | Grupo ATENDENTE                         |
| `USR-00003` Sócio Inativo     | Usuário inativo                         |
| `USR-00004` Sócio no Limite   | Já possui 3 fitas em aberto             |
| `USR-00005` a `USR-00304`     | Sócios gerados aleatoriamente           |
| Filme 1 `VHS-0001` Fita Única | Nenhuma fita disponível                 |

Chamadas para testar cada mensagem:

| Chamada                                                  | Resultado esperado                         |
|----------------------------------------------------------|--------------------------------------------|
| `CALL sp_emprestar('USR-00003', <filme com fita>);`      | `Usuário inativo`                          |
| `CALL sp_emprestar('USR-00004', <filme com fita>);`      | `Limite de 3 fitas em aberto atingido`     |
| `CALL sp_emprestar('USR-00200', 1);`                     | `Nenhuma fita disponível para este filme`  |
| `CALL sp_emprestar('USR-99999', <filme com fita>);`      | `Usuário não encontrado`                   |
| `CALL sp_emprestar('USR-00200', 9999);`                  | `Filme não encontrado`                     |
| `CALL sp_devolver('EMP-2020-00001');`                    | `Empréstimo não encontrado`                |

Um filme com fita disponível pode ser encontrado com `SELECT id_filme FROM vw_catalogo WHERE qtd_disponivel > 0 LIMIT 1;`. Os títulos, nomes e datas mudam a cada execução do `08_dados_teste.sql`.
