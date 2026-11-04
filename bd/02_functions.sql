USE videoteca;

DROP FUNCTION IF EXISTS fn_novo_id_usuario;
DROP FUNCTION IF EXISTS fn_novo_id_emprestimo;
DROP FUNCTION IF EXISTS fn_calcular_multa;

DELIMITER $$

CREATE FUNCTION fn_novo_id_usuario()
RETURNS CHAR(9)
READS SQL DATA
BEGIN
  DECLARE v_ultimo CHAR(9);

  SELECT id_usuario
    INTO v_ultimo
    FROM usuarios
   ORDER BY id_usuario DESC
   LIMIT 1;

  RETURN CONCAT('USR-', LPAD(IFNULL(CAST(SUBSTRING(v_ultimo, 5) AS UNSIGNED), 0) + 1, 5, '0'));
END$$

CREATE FUNCTION fn_novo_id_emprestimo(p_data_retirada DATE)
RETURNS CHAR(14)
READS SQL DATA
BEGIN
  DECLARE v_prefixo CHAR(9);
  DECLARE v_ultimo CHAR(14);

  SET v_prefixo = CONCAT('EMP-', YEAR(p_data_retirada), '-');

  SELECT id_emprestimo
    INTO v_ultimo
    FROM emprestimos
   WHERE id_emprestimo LIKE CONCAT(v_prefixo, '%')
   ORDER BY id_emprestimo DESC
   LIMIT 1;

  RETURN CONCAT(v_prefixo, LPAD(IFNULL(CAST(SUBSTRING(v_ultimo, 10) AS UNSIGNED), 0) + 1, 5, '0'));
END$$

CREATE FUNCTION fn_calcular_multa(p_data_prevista DATE, p_data_devolucao DATE)
RETURNS DECIMAL(6,2)
DETERMINISTIC
BEGIN
  RETURN GREATEST(DATEDIFF(p_data_devolucao, p_data_prevista), 0) * 2.00;
END$$

DELIMITER ;
