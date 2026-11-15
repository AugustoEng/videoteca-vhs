'use strict';

const mysql = require('mysql2/promise');

async function criarRepositorio() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });

  // Ping inicial: falha cedo com mensagem clara se credenciais/schema estiverem
  // errados, em vez de estourar na primeira requisição do usuário.
  try {
    await pool.query('SELECT 1');
  } catch (erro) {
    await pool.end().catch(() => {});
    throw new Error(
      'Não foi possível conectar ao MySQL. Verifique DB_HOST, DB_PORT, DB_NAME, ' +
      'DB_USER e DB_PASSWORD no arquivo .env.',
      { cause: erro }
    );
  }

  // ---------------------------------------------------------------------------
  // Métodos do contrato. Todos usam pool.execute() com placeholders (?) para
  // prepared statements reais. Erros do MySQL sobem para o servico.js, que os
  // traduz via traduzirErroBanco().
  // ---------------------------------------------------------------------------

  async function buscarUsuarioPorEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id_usuario, nome, email, senha_hash, ativo, id_grupo ' +
      'FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  async function buscarUsuarioPorId(id) {
    const [rows] = await pool.execute(
      'SELECT id_usuario, nome, email, ativo, id_grupo ' +
      'FROM usuarios WHERE id_usuario = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  async function listarUsuarios() {
    const [rows] = await pool.execute(
      'SELECT id_usuario, nome, email, ativo, id_grupo ' +
      'FROM usuarios ORDER BY nome'
    );
    return rows;
  }

  async function listarGrupos() {
    const [rows] = await pool.execute(
      'SELECT id_grupo, nome, descricao FROM grupos_usuarios ORDER BY id_grupo'
    );
    return rows;
  }

  async function criarUsuario({ nome, email, senhaHash, idGrupo }) {
    // id_usuario é gerado pelo trigger no MySQL; não enviamos essa coluna.
    await pool.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, id_grupo) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, idGrupo]
    );
  }

  async function alterarStatusUsuario(idUsuario, ativo) {
    await pool.execute(
      'UPDATE usuarios SET ativo = ? WHERE id_usuario = ?',
      [ativo ? 1 : 0, idUsuario]
    );
  }

  async function listarCatalogo({ busca, genero, somenteDisponiveis, limite, offset }) {
    // Monta a cláusula WHERE dinamicamente, sempre com placeholders.
    let where = ' WHERE 1=1';
    const params = [];

    if (busca) {
      // Escapa \\, % e _ para que a busca seja pelo início literal do título.
      where += " AND titulo LIKE CONCAT(?, '%')";
      params.push(busca.replace(/[\\%_]/g, '\\$&'));
    }
    if (genero) {
      where += ' AND genero = ?';
      params.push(genero);
    }
    if (somenteDisponiveis) {
      where += ' AND qtd_disponivel > 0';
    }

    // Contagem total com os mesmos filtros (sem LIMIT/OFFSET).
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM vw_catalogo${where}`,
      params
    );

    const [itens] = await pool.execute(
      'SELECT id_filme, codigo_catalogo, titulo, diretor, ano_lancamento, ' +
      'genero, qtd_total, qtd_disponivel ' +
      `FROM vw_catalogo${where} ORDER BY titulo, id_filme LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    );

    return { itens, total: Number(countRows[0].total) };
  }

  async function listarEmprestimosAtivos({ idUsuario }) {
    // Se idUsuario for null, retorna todos (perfil ADMIN/ATENDENTE).
    if (idUsuario) {
      const [rows] = await pool.execute(
        'SELECT id_emprestimo, id_usuario, socio, titulo, data_retirada, ' +
        'data_prevista, dias_atraso, multa_prevista ' +
        'FROM vw_emprestimos_ativos WHERE id_usuario = ? ' +
        'ORDER BY data_prevista, id_emprestimo',
        [idUsuario]
      );
      return rows;
    }
    const [rows] = await pool.execute(
      'SELECT id_emprestimo, id_usuario, socio, titulo, data_retirada, ' +
      'data_prevista, dias_atraso, multa_prevista ' +
      'FROM vw_emprestimos_ativos ORDER BY data_prevista, id_emprestimo'
    );
    return rows;
  }

  async function registrarEmprestimo({ idUsuario, idFilme }) {
    // A procedure valida estoque, limite de 3 fitas e transação, e devolve o código EMP.
    const [resultado] = await pool.execute('CALL sp_emprestar(?, ?)', [idUsuario, idFilme]);
    const linhas = Array.isArray(resultado) ? resultado[0] : null;
    const linha = Array.isArray(linhas) ? linhas[0] : null;
    return { idEmprestimo: linha?.id_emprestimo ?? null };
  }

  async function registrarDevolucao({ idEmprestimo }) {
    // A procedure calcula multa e devolve estoque com transação.
    await pool.execute('CALL sp_devolver(?)', [idEmprestimo]);
  }

  return {
    buscarUsuarioPorEmail,
    buscarUsuarioPorId,
    listarUsuarios,
    listarGrupos,
    criarUsuario,
    alterarStatusUsuario,
    listarCatalogo,
    listarEmprestimosAtivos,
    registrarEmprestimo,
    registrarDevolucao,
  };
}

module.exports = { criarRepositorio };