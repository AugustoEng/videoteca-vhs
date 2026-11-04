USE videoteca;

DROP PROCEDURE IF EXISTS sp_emprestar;
DROP PROCEDURE IF EXISTS sp_devolver;

DELIMITER $$

CREATE PROCEDURE sp_emprestar(IN p_id_usuario CHAR(9), IN p_id_filme INT)
BEGIN
  DECLARE v_ativo BOOLEAN;
  DECLARE v_disponivel INT;
  DECLARE v_abertos INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT ativo
    INTO v_ativo
    FROM usuarios
   WHERE id_usuario = p_id_usuario;

  IF v_ativo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuário não encontrado';
  END IF;

  IF v_ativo = FALSE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuário inativo';
  END IF;

  SELECT qtd_disponivel
    INTO v_disponivel
    FROM filmes
   WHERE id_filme = p_id_filme
     FOR UPDATE;

  IF v_disponivel IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Filme não encontrado';
  END IF;

  IF v_disponivel = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nenhuma fita disponível para este filme';
  END IF;

  INSERT INTO emprestimos (id_usuario, id_filme)
  VALUES (p_id_usuario, p_id_filme);

  SELECT COUNT(*)
    INTO v_abertos
    FROM emprestimos
   WHERE id_usuario = p_id_usuario
     AND data_devolucao IS NULL;

  IF v_abertos > 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Limite de 3 fitas em aberto atingido';
  END IF;

  COMMIT;
END$$

CREATE PROCEDURE sp_devolver(IN p_id_emprestimo CHAR(14))
BEGIN
  DECLARE v_data_prevista DATE;
  DECLARE v_data_devolucao DATE;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT data_prevista, data_devolucao
    INTO v_data_prevista, v_data_devolucao
    FROM emprestimos
   WHERE id_emprestimo = p_id_emprestimo
     FOR UPDATE;

  IF v_data_prevista IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empréstimo não encontrado';
  END IF;

  IF v_data_devolucao IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empréstimo já devolvido';
  END IF;

  UPDATE emprestimos
     SET data_devolucao = CURRENT_DATE,
         valor_multa = fn_calcular_multa(v_data_prevista, CURRENT_DATE)
   WHERE id_emprestimo = p_id_emprestimo;

  COMMIT;
END$$

DELIMITER ;
