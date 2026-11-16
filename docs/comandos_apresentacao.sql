-- =====================================================================
-- VIDEOTECA VHS: COMANDOS DA APRESENTAÇÃO
-- Abra este arquivo nas duas abas do Workbench (admin e app).
-- Rode UM comando por vez com Ctrl+Enter (cursor sobre o comando).
-- Deixe o painel Output visível: os erros 1644 e 1142 aparecem nele.
-- =====================================================================


-- =====================================================================
-- PREPARAÇÃO (aba ADMIN, antes de começar)
-- =====================================================================

-- P1. Filmes com 3 ou mais fitas (escolha o Filme F)
SELECT id_filme, titulo, qtd_disponivel, qtd_total FROM filmes WHERE qtd_disponivel >= 3 ORDER BY id_filme LIMIT 3;

-- P2. Sócios sem fitas em aberto (escolha o Sócio A para o front e o Sócio B para o bloco 3)
SELECT u.id_usuario, u.nome, u.email FROM usuarios u WHERE u.id_grupo = 3 AND u.ativo AND NOT EXISTS (SELECT 1 FROM emprestimos e WHERE e.id_usuario = u.id_usuario AND e.data_devolucao IS NULL) ORDER BY u.id_usuario LIMIT 4;

-- P3. Conferências: USR-00004 precisa ter 3; o prefixo precisa ter cerca de 30 filmes
SELECT COUNT(*) AS abertos_usr_00004 FROM emprestimos WHERE id_usuario = 'USR-00004' AND data_devolucao IS NULL;
SELECT COUNT(*) AS filmes_com_prefixo FROM filmes WHERE titulo LIKE 'O Farol%';

-- P4. TROQUE OS DOIS VALORES e rode as duas linhas (vale enquanto a aba ficar aberta;
--     se o Workbench reconectar, rode de novo)
SET @filme_f = 0;            -- TROCAR pelo id_filme do Filme F
SET @socio_b = 'USR-00000';  -- TROCAR pelo código do Sócio B


-- =====================================================================
-- BLOCO 1: BANCO E MODELAGEM (aba ADMIN, opcional)
-- =====================================================================

-- 1.1. Tabelas e views do banco
SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'videoteca' ORDER BY TABLE_TYPE, TABLE_NAME;


-- =====================================================================
-- BLOCO 3: COMMIT E ROLLBACK (aba ADMIN)
-- Ordem: 3.1, 3.2, 3.1, 3.3, 3.1
-- =====================================================================

-- 3.1. Estado do banco (rodar 3 vezes)
SELECT (SELECT qtd_disponivel FROM filmes WHERE id_filme = @filme_f) AS estoque_filme_f, (SELECT COUNT(*) FROM emprestimos) AS total_emprestimos, (SELECT COUNT(*) FROM emprestimos WHERE id_usuario = 'USR-00004' AND data_devolucao IS NULL) AS abertos_usr_00004, (SELECT ultimo FROM sequencias WHERE chave = CONCAT('EMP-', YEAR(CURDATE()))) AS contador_emp;

-- 3.2. Retirada recusada: ROLLBACK (esperado: Error Code 1644, Limite de 3 fitas em aberto atingido)
CALL sp_emprestar('USR-00004', @filme_f);

-- 3.3. Retirada aceita: COMMIT (esperado: uma linha com EMP-2026-...)
CALL sp_emprestar(@socio_b, @filme_f);


-- =====================================================================
-- BLOCO 4: ÍNDICES (aba ADMIN)
-- Ler: type, key, rows, Extra
-- =====================================================================

-- 4.1. Em aberto por prazo, COM índice (esperado: ref, cerca de 150 linhas)
EXPLAIN SELECT id_emprestimo, data_prevista FROM emprestimos WHERE data_devolucao IS NULL ORDER BY data_prevista;

-- 4.2. Em aberto por prazo, SEM índice (esperado: ALL, cerca de 20 mil linhas, Using filesort)
EXPLAIN SELECT id_emprestimo, data_prevista FROM emprestimos IGNORE INDEX (idx_emprestimos_devolucao_prevista) WHERE data_devolucao IS NULL ORDER BY data_prevista;

-- 4.3. Fitas do sócio, COM índice (esperado: 3 linhas)
EXPLAIN SELECT COUNT(*) FROM emprestimos WHERE id_usuario = 'USR-00004' AND data_devolucao IS NULL;

-- 4.4. Fitas do sócio, SEM o índice (esperado: cerca de 150 linhas)
EXPLAIN SELECT COUNT(*) FROM emprestimos IGNORE INDEX (idx_emprestimos_usuario_devolucao) WHERE id_usuario = 'USR-00004' AND data_devolucao IS NULL;

-- 4.5. Busca por título, COM índice (esperado: range, cerca de 35 linhas)
EXPLAIN SELECT id_filme, titulo FROM filmes WHERE titulo LIKE 'O Farol%';

-- 4.6. Busca por título, SEM índice (esperado: ALL, 401 linhas)
EXPLAIN SELECT id_filme, titulo FROM filmes IGNORE INDEX (idx_filmes_titulo) WHERE titulo LIKE 'O Farol%';


-- =====================================================================
-- BLOCO 5: VIEWS (aba APP)
-- =====================================================================

-- 5.1. Catálogo pela view (apontar a coluna genero)
SELECT * FROM vw_catalogo WHERE titulo LIKE 'O Farol%' LIMIT 5;

-- 5.2. Empréstimos mais atrasados pela view (apontar dias_atraso e multa_prevista)
SELECT id_emprestimo, socio, titulo, data_prevista, dias_atraso, multa_prevista FROM vw_emprestimos_ativos ORDER BY dias_atraso DESC LIMIT 5;


-- =====================================================================
-- BLOCO 6: PROCEDURES, FUNCTIONS E TRIGGERS (aba ADMIN)
-- Não rodar SELECT fn_novo_id_usuario(): avança o contador de verdade
-- =====================================================================

-- 6.1. Procedures e functions (esperado: 3 functions e 2 procedures)
SELECT ROUTINE_TYPE, ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = 'videoteca' ORDER BY ROUTINE_TYPE, ROUTINE_NAME;

-- 6.1b. Triggers (esperado: 4)
SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = 'videoteca';

-- 6.2. Multa ao vivo (esperado: 28.00 e 0.00)
SELECT fn_calcular_multa('2026-11-01', '2026-11-15') AS multa_14_dias, fn_calcular_multa('2026-11-15', '2026-11-14') AS multa_no_prazo;


-- =====================================================================
-- BLOCO 7: CONTROLE DE ACESSO (aba APP)
-- =====================================================================

-- 7.1. Quem sou eu (esperado: app_videoteca@localhost)
SELECT CURRENT_USER();

-- 7.1b. O que posso (apontar: nada sobre filmes e emprestimos)
SHOW GRANTS;

-- 7.2. Apagar tabela (esperado: Error Code 1142, DROP command denied)
--      Seguro nas duas abas: na admin, a chave estrangeira impede (erro 3730)
DROP TABLE usuarios;

-- 7.3. Ler a tabela direto (esperado: Error Code 1142, SELECT command denied)
SELECT * FROM emprestimos LIMIT 1;
