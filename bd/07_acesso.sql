DROP USER IF EXISTS 'app_videoteca'@'localhost';
DROP USER IF EXISTS 'relatorio_videoteca'@'localhost';
DROP ROLE IF EXISTS 'role_aplicacao';
DROP ROLE IF EXISTS 'role_relatorio';

CREATE ROLE 'role_aplicacao';
CREATE ROLE 'role_relatorio';

GRANT SELECT ON videoteca.vw_catalogo TO 'role_aplicacao';
GRANT SELECT ON videoteca.vw_emprestimos_ativos TO 'role_aplicacao';
GRANT SELECT ON videoteca.grupos_usuarios TO 'role_aplicacao';
GRANT SELECT, INSERT, UPDATE ON videoteca.usuarios TO 'role_aplicacao';
GRANT EXECUTE ON PROCEDURE videoteca.sp_emprestar TO 'role_aplicacao';
GRANT EXECUTE ON PROCEDURE videoteca.sp_devolver TO 'role_aplicacao';

GRANT SELECT ON videoteca.vw_catalogo TO 'role_relatorio';
GRANT SELECT ON videoteca.vw_emprestimos_ativos TO 'role_relatorio';

CREATE USER 'app_videoteca'@'localhost' IDENTIFIED BY 'App!Vhs2026';
CREATE USER 'relatorio_videoteca'@'localhost' IDENTIFIED BY 'Rel!Vhs2026';

GRANT 'role_aplicacao' TO 'app_videoteca'@'localhost';
GRANT 'role_relatorio' TO 'relatorio_videoteca'@'localhost';

SET DEFAULT ROLE ALL TO 'app_videoteca'@'localhost';
SET DEFAULT ROLE ALL TO 'relatorio_videoteca'@'localhost';
