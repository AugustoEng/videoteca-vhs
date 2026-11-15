# Contrato para Christopher — conexão MySQL (camada de persistência)

**Responsáveis:** Erick: regras de negócio, validações, autenticação e API. Christopher: implementação do acesso ao MySQL.

O projeto original traz `bd/INTEGRACAO.md` e os scripts `bd/01_ddl.sql` a `bd/08_dados_teste.sql`. Este módulo respeita os nomes reais de tabelas, procedures e views desses scripts.

## Como integrar

Criar `app/backend/src/repositorios/mysql-repository.js` que exporte:

```js
async function criarRepositorio() {
  // Conectar por pool (ex.: mysql2/promise) com variáveis de ambiente.
  // Retornar objeto contendo todos os métodos descritos abaixo.
  // Nunca criar conexão como root.
  return {
    buscarUsuarioPorEmail, buscarUsuarioPorId, listarUsuarios, listarGrupos,
    criarUsuario, alterarStatusUsuario, listarCatalogo,
    listarEmprestimosAtivos, registrarEmprestimo, registrarDevolucao
  };
}
module.exports = { criarRepositorio };
```

Não há arquivo desse tipo no repositório original: **esse arquivo deverá ser implementado por Christopher**. Este módulo não afirma realizar conexão real com MySQL enquanto o adaptador estiver ausente.

**Permissões da API:** `GET /api/usuarios` é permitido aos grupos ADMIN e ATENDENTE. Cadastro e alteração de status continuam exclusivos de ADMIN. A conta MySQL `app_videoteca` já possui a permissão `SELECT` necessária na tabela `usuarios`. O script `npm start` lê `app/backend/.env` automaticamente com `node --env-file=.env`. 

## Métodos necessários

| Método do repositório | Entradas | Saída esperada | Consulta real sugerida |
|---|---|---|---|
| `buscarUsuarioPorEmail(email)` | string | objeto `usuarios` com `senha_hash` ou `null` | `SELECT id_usuario,nome,email,senha_hash,ativo,id_grupo FROM usuarios WHERE email = ? LIMIT 1` |
| `buscarUsuarioPorId(id)` | string | objeto `usuarios` ou `null` | `SELECT id_usuario,nome,email,ativo,id_grupo FROM usuarios WHERE id_usuario = ? LIMIT 1` |
| `listarUsuarios()` | nenhuma | array de usuários, sem senha | `SELECT id_usuario,nome,email,ativo,id_grupo FROM usuarios ORDER BY nome` |
| `listarGrupos()` | nenhuma | array de grupos | `SELECT id_grupo,nome,descricao FROM grupos_usuarios ORDER BY id_grupo` |
| `criarUsuario({nome,email,senhaHash,idGrupo})` | objeto | `void` | `INSERT INTO usuarios (nome,email,senha_hash,id_grupo) VALUES (?,?,?,?)` |
| `alterarStatusUsuario(idUsuario,ativo)` | string, bool | `void` | `UPDATE usuarios SET ativo = ? WHERE id_usuario = ?` |
| `listarCatalogo({busca,genero,somenteDisponiveis,limite,offset})` | objeto | `{itens: [], total: number}` | Usar `vw_catalogo` com filtro/paginação e `COUNT(*)` |
| `listarEmprestimosAtivos({idUsuario})` | objeto | array de empréstimos ativos | `SELECT * FROM vw_emprestimos_ativos` com filtro por usuário opcional |
| `registrarEmprestimo({idUsuario,idFilme})` | objeto | `{ idEmprestimo }` (código EMP devolvido pela procedure) | `CALL sp_emprestar(?, ?)` |
| `registrarDevolucao({idEmprestimo})` | objeto | `void` | `CALL sp_devolver(?)` |

### Consulta do catálogo

Exemplo de formato de consulta (adaptar para filtros opcionais e realizar `COUNT(*)` separado):

```sql
SELECT id_filme, codigo_catalogo, titulo, diretor, ano_lancamento,
       genero, qtd_total, qtd_disponivel
FROM vw_catalogo
WHERE titulo LIKE CONCAT(?, '%')
  AND (? = '' OR genero = ?)
  AND (? = FALSE OR qtd_disponivel > 0)
ORDER BY titulo, id_filme
LIMIT ? OFFSET ?;
```

*Recomendação:* como `LIKE` interpreta `%` e `_` como curingas, escape esses caracteres na entrada ou recuse-os explicitamente na camada de consulta, com `ESCAPE` quando apropriado. A busca começa pelo texto informado para aproveitar melhor o índice do título.

A contagem total deve usar os mesmos filtros, sem `LIMIT`/`OFFSET`. Os resultados devem ter **nomes de colunas do banco** (`id_filme`, `qtd_disponivel`, `id_usuario`, `multa_prevista`...), pois o serviço preserva esse formato para as views. Configure as datas do driver com `dateStrings` ou converta a data para `YYYY-MM-DD` (sem deslocamento de fuso).

### Consulta de empréstimos

```sql
SELECT id_emprestimo, id_usuario, socio, titulo, data_retirada,
       data_prevista, dias_atraso, multa_prevista
FROM vw_emprestimos_ativos
WHERE (? IS NULL OR id_usuario = ?)
ORDER BY data_prevista, id_emprestimo;
```

Não acrescente informações de `senha_hash` nas respostas. Para `buscarUsuarioPorId`, a senha nem precisa ser consultada. O login usa `buscarUsuarioPorEmail`, que deve retornar o `senha_hash` sem expô-lo ao HTTP.

## Regras para a integração

1. Usar placeholders (`?`) e parâmetros vinculados; nunca concatenar o e-mail, filtro ou identificador do usuário ao SQL.
2. Usar `app_videoteca` ou conta equivalente, **jamais root**. Credenciais devem estar apenas em `.env`, fora do Git.
3. Empréstimo e devolução: **somente** `CALL sp_emprestar` e `CALL sp_devolver`. Não repetir atualização de estoque, cálculo de multa nem controle transacional em JavaScript.
4. IDs são gerados pelo banco (triggers/functions); não preencher `id_usuario` ao inserir.
5. Deixar os erros SQL chegarem ao serviço; ele já converte `1644` (regra de negócio) e `1062` (e-mail duplicado) em respostas HTTP seguras.
6. O servidor falha deliberadamente ao iniciar sem o adaptador, para não fingir que o banco está conectado. Use `npm run dev:demo` somente para demonstração local.
7. No banco real, validar concorrência/transações para os geradores de ID e limite de empréstimos antes de utilizar com múltiplos operadores simultâneos. Isso exige revisão dos scripts SQL pelo responsável pelo banco.

## Senha e segurança

O esquema fornecido pelo repositório guarda `SHA2(senha, 256)` sem salt. Para compatibilidade com os scripts existentes, a lógica de login e cadastro usa SHA-256. **Esse formato não é adequado para um sistema de produção.** Em um projeto real, seria necessário migrar para Argon2id/bcrypt com salt e alterar a autenticação em conjunto com o banco.

Tokens têm validade de duas horas, são assinados com HMAC-SHA256 e exigem `AUTH_SECRET` de pelo menos 32 caracteres. O serviço consulta novamente o usuário a cada requisição, garantindo que a desativação passe a valer imediatamente.
