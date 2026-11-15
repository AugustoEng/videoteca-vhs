USE videoteca;

CREATE INDEX idx_emprestimos_usuario_devolucao ON emprestimos (id_usuario, data_devolucao);
CREATE INDEX idx_emprestimos_devolucao_prevista ON emprestimos (data_devolucao, data_prevista);
CREATE INDEX idx_filmes_titulo ON filmes (titulo);
