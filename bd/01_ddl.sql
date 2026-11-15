DROP DATABASE IF EXISTS videoteca;
CREATE DATABASE videoteca CHARACTER SET utf8mb4;
USE videoteca;

CREATE TABLE grupos_usuarios (
  id_grupo  INT          NOT NULL AUTO_INCREMENT,
  nome      VARCHAR(30)  NOT NULL,
  descricao VARCHAR(150) NOT NULL,
  PRIMARY KEY (id_grupo)
) ENGINE=InnoDB;

CREATE TABLE generos (
  id_genero INT         NOT NULL AUTO_INCREMENT,
  nome      VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_genero)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id_usuario CHAR(9)      NOT NULL,
  nome       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
  id_grupo   INT          NOT NULL,
  PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT fk_usuarios_grupo FOREIGN KEY (id_grupo)
    REFERENCES grupos_usuarios (id_grupo) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE filmes (
  id_filme        INT          NOT NULL AUTO_INCREMENT,
  codigo_catalogo VARCHAR(20)  NOT NULL,
  titulo          VARCHAR(150) NOT NULL,
  diretor         VARCHAR(100) NOT NULL,
  ano_lancamento  YEAR         NOT NULL,
  qtd_total       INT          NOT NULL,
  qtd_disponivel  INT          NOT NULL,
  id_genero       INT          NOT NULL,
  PRIMARY KEY (id_filme),
  CONSTRAINT uq_filmes_codigo_catalogo UNIQUE (codigo_catalogo),
  CONSTRAINT fk_filmes_genero FOREIGN KEY (id_genero)
    REFERENCES generos (id_genero) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_filmes_estoque CHECK (qtd_disponivel BETWEEN 0 AND qtd_total)
) ENGINE=InnoDB;

CREATE TABLE emprestimos (
  id_emprestimo  CHAR(14)     NOT NULL,
  id_usuario     CHAR(9)      NOT NULL,
  id_filme       INT          NOT NULL,
  data_retirada  DATE         NOT NULL DEFAULT (CURRENT_DATE),
  data_prevista  DATE         NOT NULL,
  data_devolucao DATE         NULL,
  valor_multa    DECIMAL(6,2) NULL,
  PRIMARY KEY (id_emprestimo),
  CONSTRAINT fk_emprestimos_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_emprestimos_filme FOREIGN KEY (id_filme)
    REFERENCES filmes (id_filme) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_emprestimos_prazo CHECK (data_prevista >= data_retirada),
  CONSTRAINT ck_emprestimos_devolucao CHECK (data_devolucao IS NULL OR data_devolucao >= data_retirada),
  CONSTRAINT ck_emprestimos_multa CHECK (valor_multa IS NULL OR valor_multa >= 0)
) ENGINE=InnoDB;
