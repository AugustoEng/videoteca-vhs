USE videoteca;

INSERT INTO grupos_usuarios (nome, descricao) VALUES
  ('ADMIN', 'Gerencia usuários e acervo'),
  ('ATENDENTE', 'Registra retiradas e devoluções'),
  ('SOCIO', 'Consulta o catálogo e os próprios empréstimos');

INSERT INTO generos (nome) VALUES
  ('Ação'), ('Aventura'), ('Comédia'), ('Drama'),
  ('Ficção Científica'), ('Terror'), ('Romance'), ('Animação');

INSERT INTO usuarios (nome, email, senha_hash, ativo, id_grupo) VALUES
  ('Administrador', 'admin@videoteca.com', SHA2('123456', 256), TRUE, 1);
INSERT INTO usuarios (nome, email, senha_hash, ativo, id_grupo) VALUES
  ('Atendente', 'atendente@videoteca.com', SHA2('123456', 256), TRUE, 2);
INSERT INTO usuarios (nome, email, senha_hash, ativo, id_grupo) VALUES
  ('Sócio Inativo', 'inativo@videoteca.com', SHA2('123456', 256), FALSE, 3);
INSERT INTO usuarios (nome, email, senha_hash, ativo, id_grupo) VALUES
  ('Sócio no Limite', 'limite@videoteca.com', SHA2('123456', 256), TRUE, 3);

INSERT INTO filmes (codigo_catalogo, titulo, diretor, ano_lancamento, qtd_total, qtd_disponivel, id_genero) VALUES
  ('VHS-0001', 'Fita Única', 'Diretor Teste', 1990, 1, 1, 4);

DROP PROCEDURE IF EXISTS sp_carga_teste;

DELIMITER $$

CREATE PROCEDURE sp_carga_teste()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE v_retirada DATE;
  DECLARE v_devolucao DATE;
  DECLARE v_qtd INT;

  WHILE i <= 400 DO
    SET v_qtd = 1 + FLOOR(RAND() * 4);
    INSERT INTO filmes (codigo_catalogo, titulo, diretor, ano_lancamento, qtd_total, qtd_disponivel, id_genero)
    VALUES (
      CONCAT('VHS-', LPAD(i + 1, 4, '0')),
      CONCAT(ELT(1 + FLOOR(RAND() * 12), 'A Noite', 'O Retorno', 'A Fuga', 'O Segredo', 'A Cidade', 'O Silêncio',
                 'A Herança', 'O Caçador', 'A Tempestade', 'O Labirinto', 'A Estrada', 'O Farol'),
             ' ',
             ELT(1 + FLOOR(RAND() * 10), 'do Vale', 'das Sombras', 'do Norte', 'de Fogo', 'do Tempo',
                 'de Gelo', 'do Abismo', 'da Meia-Noite', 'de Cristal', 'sem Fim')),
      CONCAT(ELT(1 + FLOOR(RAND() * 8), 'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gisele', 'Hugo'),
             ' ',
             ELT(1 + FLOOR(RAND() * 8), 'Moreira', 'Lacerda', 'Prado', 'Vasconcelos', 'Teixeira', 'Rocha', 'Amaral', 'Brandão')),
      1975 + FLOOR(RAND() * 25),
      v_qtd,
      v_qtd,
      1 + FLOOR(RAND() * 8)
    );
    SET i = i + 1;
  END WHILE;

  SET i = 1;
  WHILE i <= 300 DO
    INSERT INTO usuarios (nome, email, senha_hash, ativo, id_grupo)
    VALUES (
      CONCAT(ELT(1 + FLOOR(RAND() * 10), 'João', 'Maria', 'Pedro', 'Juliana', 'Lucas', 'Fernanda', 'Rafael', 'Beatriz', 'Thiago', 'Larissa'),
             ' ',
             ELT(1 + FLOOR(RAND() * 10), 'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Almeida', 'Ribeiro', 'Martins')),
      CONCAT('socio', i, '@videoteca.com'),
      SHA2('123456', 256),
      TRUE,
      3
    );
    SET i = i + 1;
  END WHILE;

  START TRANSACTION;
  SET i = 1;
  WHILE i <= 20000 DO
    SET v_retirada = CURRENT_DATE - INTERVAL (30 + FLOOR(RAND() * 700)) DAY;
    SET v_devolucao = v_retirada + INTERVAL FLOOR(RAND() * 7) DAY;
    INSERT INTO emprestimos (id_usuario, id_filme, data_retirada, data_devolucao, valor_multa)
    VALUES (
      CONCAT('USR-', LPAD(3 + FLOOR(RAND() * 302), 5, '0')),
      1 + FLOOR(RAND() * 401),
      v_retirada,
      v_devolucao,
      fn_calcular_multa(v_retirada + INTERVAL 3 DAY, v_devolucao)
    );
    SET i = i + 1;
  END WHILE;
  COMMIT;

  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
    SET i = 1;
    WHILE i <= 150 DO
      INSERT INTO emprestimos (id_usuario, id_filme, data_retirada)
      VALUES (
        CONCAT('USR-', LPAD(4 + i, 5, '0')),
        4 + FLOOR(RAND() * 398),
        CURRENT_DATE - INTERVAL FLOOR(RAND() * 10) DAY
      );
      SET i = i + 1;
    END WHILE;
  END;
END$$

DELIMITER ;

CALL sp_emprestar('USR-00004', 1);
CALL sp_carga_teste();
DROP PROCEDURE sp_carga_teste;

CALL sp_emprestar('USR-00004', 2);
CALL sp_emprestar('USR-00004', 3);
