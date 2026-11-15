USE videoteca;

DROP FUNCTION IF EXISTS fn_novo_id_usuario;
DROP FUNCTION IF EXISTS fn_novo_id_emprestimo;
DROP FUNCTION IF EXISTS fn_calcular_multa;

DELIMITER $$

CREATE FUNCTION fn_novo_id_usuario()
RETURNS CHAR(9)
MODIFIES SQL DATA
BEGIN
  DECLARE v_numero INT;

  UPDATE sequencias
     SET ultimo = ultimo + 1
   WHERE chave = 'USR';

  SELECT ultimo
    INTO v_numero
    FROM sequencias
   WHERE chave = 'USR';

  RETURN CONCAT('USR-', LPAD(v_numero, 5, '0'));
END$$

CREATE FUNCTION fn_novo_id_emprestimo(p_data_retirada DATE)
RETURNS CHAR(14)
MODIFIES SQL DATA
BEGIN
  DECLARE v_chave VARCHAR(20);
  DECLARE v_numero INT;

  SET v_chave = CONCAT('EMP-', YEAR(p_data_retirada));

  INSERT INTO sequencias (chave, ultimo)
  VALUES (v_chave, 1)
  ON DUPLICATE KEY UPDATE ultimo = ultimo + 1;

  SELECT ultimo
    INTO v_numero
    FROM sequencias
   WHERE chave = v_chave;

  RETURN CONCAT(v_chave, '-', LPAD(v_numero, 5, '0'));
END$$

CREATE FUNCTION fn_calcular_multa(p_data_prevista DATE, p_data_devolucao DATE)
RETURNS DECIMAL(6,2)
DETERMINISTIC
BEGIN
  RETURN GREATEST(DATEDIFF(p_data_devolucao, p_data_prevista), 0) * 2.00;
END$$

DELIMITER ;
