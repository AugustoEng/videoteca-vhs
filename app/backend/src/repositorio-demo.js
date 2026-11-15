'use strict';

const { createHash } = require('node:crypto');

const hash = (senha) => createHash('sha256').update(senha).digest('hex');
const hoje = () => new Date().toISOString().slice(0, 10);
const adicionarDias = (data, dias) => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
const diasEntre = (inicio, fim) => Math.round((new Date(`${fim}T12:00:00Z`) - new Date(`${inicio}T12:00:00Z`)) / 86400000);

function recusa(mensagem) {
  const erro = new Error(mensagem);
  erro.errno = 1644;
  erro.sqlState = '45000';
  erro.sqlMessage = mensagem;
  throw erro;
}

function criarRepositorioDemo() {
  const grupos = [
    { id_grupo: 1, nome: 'ADMIN', descricao: 'Gerencia usuários e acervo' },
    { id_grupo: 2, nome: 'ATENDENTE', descricao: 'Registra retiradas e devoluções' },
    { id_grupo: 3, nome: 'SOCIO', descricao: 'Consulta o catálogo e os próprios empréstimos' }
  ];
  const usuarios = [
    { id_usuario: 'USR-00001', nome: 'Administrador', email: 'admin@videoteca.com', id_grupo: 1, ativo: true, senha_hash: hash('123456') },
    { id_usuario: 'USR-00002', nome: 'Atendente', email: 'atendente@videoteca.com', id_grupo: 2, ativo: true, senha_hash: hash('123456') },
    { id_usuario: 'USR-00003', nome: 'Sócio Inativo', email: 'inativo@videoteca.com', id_grupo: 3, ativo: false, senha_hash: hash('123456') },
    { id_usuario: 'USR-00004', nome: 'Sócio no Limite', email: 'limite@videoteca.com', id_grupo: 3, ativo: true, senha_hash: hash('123456') },
    { id_usuario: 'USR-00005', nome: 'Sócio Exemplo', email: 'socio1@videoteca.com', id_grupo: 3, ativo: true, senha_hash: hash('123456') }
  ];
  const filmes = [
    { id_filme: 1, codigo_catalogo: 'VHS-0001', titulo: 'Fita Única', diretor: 'Diretor Teste', ano_lancamento: 1990, genero: 'Drama', qtd_total: 1, qtd_disponivel: 0 },
    { id_filme: 2, codigo_catalogo: 'VHS-0002', titulo: 'Matrix', diretor: 'Lana e Lilly Wachowski', ano_lancamento: 1999, genero: 'Ficção Científica', qtd_total: 5, qtd_disponivel: 3 },
    { id_filme: 3, codigo_catalogo: 'VHS-0003', titulo: 'Jurassic Park', diretor: 'Steven Spielberg', ano_lancamento: 1993, genero: 'Aventura', qtd_total: 3, qtd_disponivel: 2 },
    { id_filme: 4, codigo_catalogo: 'VHS-0004', titulo: 'O Exorcista', diretor: 'William Friedkin', ano_lancamento: 1973, genero: 'Terror', qtd_total: 4, qtd_disponivel: 4 }
  ];
  const registros = [
    { id_emprestimo: `EMP-${hoje().slice(0, 4)}-00001`, id_usuario: 'USR-00004', id_filme: 2, data_retirada: adicionarDias(hoje(), -5), data_prevista: adicionarDias(hoje(), -2), data_devolucao: null },
    { id_emprestimo: `EMP-${hoje().slice(0, 4)}-00002`, id_usuario: 'USR-00004', id_filme: 2, data_retirada: hoje(), data_prevista: adicionarDias(hoje(), 3), data_devolucao: null },
    { id_emprestimo: `EMP-${hoje().slice(0, 4)}-00003`, id_usuario: 'USR-00004', id_filme: 3, data_retirada: hoje(), data_prevista: adicionarDias(hoje(), 3), data_devolucao: null }
  ];
  let sequenciaUsuario = 5;
  let sequenciaEmprestimo = 3;

  return {
    async buscarUsuarioPorEmail(email) { return usuarios.find(u => u.email === email) || null; },
    async buscarUsuarioPorId(id) { return usuarios.find(u => u.id_usuario === id) || null; },
    async listarUsuarios() { return usuarios.slice(); },
    async listarGrupos() { return grupos.slice(); },
    async criarUsuario({ nome, email, senhaHash, idGrupo }) {
      if (usuarios.some(u => u.email === email)) {
        const erro = new Error("Duplicate entry '" + email + "' for key 'usuarios.uq_usuarios_email'");
        erro.errno = 1062;
        erro.sqlMessage = erro.message;
        throw erro;
      }
      const id_usuario = `USR-${String(++sequenciaUsuario).padStart(5, '0')}`;
      usuarios.push({ id_usuario, nome, email, senha_hash: senhaHash, id_grupo: idGrupo, ativo: true });
    },
    async alterarStatusUsuario(id, ativo) {
      const usuario = usuarios.find(u => u.id_usuario === id);
      if (usuario) usuario.ativo = ativo;
    },
    async listarCatalogo({ busca, genero, somenteDisponiveis, limite, offset }) {
      // Simula o SELECT sobre a vw_catalogo. A implementação SQL será do Christopher.
      const filtrados = filmes.filter(f =>
        f.titulo.toLocaleLowerCase('pt-BR').startsWith(busca.toLocaleLowerCase('pt-BR')) &&
        (!genero || f.genero.toLocaleLowerCase('pt-BR') === genero.toLocaleLowerCase('pt-BR')) &&
        (!somenteDisponiveis || f.qtd_disponivel > 0)
      );
      return { itens: filtrados.slice(offset, offset + limite).map(f => ({ ...f })), total: filtrados.length };
    },
    async listarEmprestimosAtivos({ idUsuario }) {
      return registros.filter(e => e.data_devolucao === null && (!idUsuario || e.id_usuario === idUsuario))
        .map(e => {
          const filme = filmes.find(f => f.id_filme === e.id_filme);
          const socio = usuarios.find(u => u.id_usuario === e.id_usuario);
          const dias_atraso = Math.max(diasEntre(e.data_prevista, hoje()), 0);
          return {
            id_emprestimo: e.id_emprestimo, id_usuario: e.id_usuario, socio: socio.nome,
            titulo: filme.titulo, data_retirada: e.data_retirada, data_prevista: e.data_prevista,
            dias_atraso, multa_prevista: (dias_atraso * 2).toFixed(2)
          };
        });
    },
    async registrarEmprestimo({ idUsuario, idFilme }) {
      const usuario = usuarios.find(u => u.id_usuario === idUsuario);
      const filme = filmes.find(f => f.id_filme === idFilme);
      if (!usuario) recusa('Usuário não encontrado');
      if (!usuario.ativo) recusa('Usuário inativo');
      if (!filme) recusa('Filme não encontrado');
      if (filme.qtd_disponivel <= 0) recusa('Nenhuma fita disponível para este filme');
      if (registros.filter(e => e.id_usuario === idUsuario && !e.data_devolucao).length >= 3) {
        recusa('Limite de 3 fitas em aberto atingido');
      }
      const agora = hoje();
      const idEmprestimo = `EMP-${agora.slice(0, 4)}-${String(++sequenciaEmprestimo).padStart(5, '0')}`;
      registros.push({
        id_emprestimo: idEmprestimo,
        id_usuario: idUsuario, id_filme: idFilme, data_retirada: agora,
        data_prevista: adicionarDias(agora, 3), data_devolucao: null
      });
      filme.qtd_disponivel -= 1;
      return { idEmprestimo };
    },
    async registrarDevolucao({ idEmprestimo }) {
      const registro = registros.find(e => e.id_emprestimo === idEmprestimo);
      if (!registro) recusa('Empréstimo não encontrado');
      if (registro.data_devolucao) recusa('Empréstimo já devolvido');
      registro.data_devolucao = hoje();
      registro.valor_multa = Math.max(diasEntre(registro.data_prevista, hoje()), 0) * 2;
      filmes.find(f => f.id_filme === registro.id_filme).qtd_disponivel += 1;
    }
  };
}

module.exports = { criarRepositorioDemo };
