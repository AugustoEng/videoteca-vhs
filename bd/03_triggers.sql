USE videoteca;

DROP TRIGGER IF EXISTS tg_usuarios_gerar_id;
DROP TRIGGER IF EXISTS tg_emprestimos_gerar_id_prazo;
DROP TRIGGER IF EXISTS tg_emprestimos_baixar_estoque;
DROP TRIGGER IF EXISTS tg_emprestimos_devolver_estoque;

DELIMITER $$

CREATE TRIGGER tg_usuarios_gerar_id
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  SET NEW.id_usuario = fn_novo_id_usuario();
END$$

CREATE TRIGGER tg_emprestimos_gerar_id_prazo
BEFORE INSERT ON emprestimos
FOR EACH ROW
BEGIN
  SET NEW.id_emprestimo = fn_novo_id_emprestimo(NEW.data_retirada);
  SET NEW.data_prevista = NEW.data_retirada + INTERVAL 3 DAY;
END$$

CREATE TRIGGER tg_emprestimos_baixar_estoque
AFTER INSERT ON emprestimos
FOR EACH ROW
BEGIN
  IF NEW.data_devolucao IS NULL THEN
    UPDATE filmes
       SET qtd_disponivel = qtd_disponivel - 1
     WHERE id_filme = NEW.id_filme;
  END IF;
END$$

CREATE TRIGGER tg_emprestimos_devolver_estoque
AFTER UPDATE ON emprestimos
FOR EACH ROW
BEGIN
  IF OLD.data_devolucao IS NULL AND NEW.data_devolucao IS NOT NULL THEN
    UPDATE filmes
       SET qtd_disponivel = qtd_disponivel + 1
     WHERE id_filme = NEW.id_filme;
  END IF;
END$$

DELIMITER ;
