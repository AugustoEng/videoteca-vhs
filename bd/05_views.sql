USE videoteca;

DROP VIEW IF EXISTS vw_catalogo;
DROP VIEW IF EXISTS vw_emprestimos_ativos;

CREATE VIEW vw_catalogo AS
SELECT f.id_filme,
       f.codigo_catalogo,
       f.titulo,
       f.diretor,
       f.ano_lancamento,
       g.nome AS genero,
       f.qtd_total,
       f.qtd_disponivel
  FROM filmes f
  JOIN generos g ON g.id_genero = f.id_genero;

CREATE VIEW vw_emprestimos_ativos AS
SELECT e.id_emprestimo,
       u.id_usuario,
       u.nome AS socio,
       f.titulo,
       e.data_retirada,
       e.data_prevista,
       GREATEST(DATEDIFF(CURRENT_DATE, e.data_prevista), 0) AS dias_atraso,
       fn_calcular_multa(e.data_prevista, CURRENT_DATE) AS multa_prevista
  FROM emprestimos e
  JOIN usuarios u ON u.id_usuario = e.id_usuario
  JOIN filmes f ON f.id_filme = e.id_filme
 WHERE e.data_devolucao IS NULL;
