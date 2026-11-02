USE videoteca;

DROP FUNCTION IF EXISTS fn_novo_id_usuario;
DROP FUNCTION IF EXISTS fn_novo_id_emprestimo;
DROP FUNCTION IF EXISTS fn_calcular_multa;

DELIMITER $$

CREATE FUNCTION fn_novo_id_usuario()
RETURNS CHAR(9)
READS SQL DATA
BEGIN
  DECLARE v_proximo INT;

  SELECT IFNULL(MAX(CAST(SUBSTRING(id_usuario, 5) AS UNSIGNED)), 0) + 1
    INTO v_proximo
    FROM usuarios;

  RETURN CONCAT('USR-', LPAD(v_proximo, 5, '0'));
END$$

CREATE FUNCTION fn_novo_id_emprestimo(p_data_retirada DATE)
RETURNS CHAR(14)
READS SQL DATA
BEGIN
  DECLARE v_prefixo CHAR(9);
  DECLARE v_proximo INT;

  SET v_prefixo = CONCAT('EMP-', YEAR(p_data_retirada), '-');

  SELECT IFNULL(MAX(CAST(SUBSTRING(id_emprestimo, 10) AS UNSIGNED)), 0) + 1
    INTO v_proximo
    FROM emprestimos
   WHERE id_emprestimo LIKE CONCAT(v_prefixo, '%');

  RETURN CONCAT(v_prefixo, LPAD(v_proximo, 5, '0'));
END$$

CREATE FUNCTION fn_calcular_multa(p_data_prevista DATE, p_data_devolucao DATE)
RETURNS DECIMAL(6,2)
DETERMINISTIC
BEGIN
  RETURN GREATEST(DATEDIFF(p_data_devolucao, p_data_prevista), 0) * 2.00;
END$$

DELIMITER ;
