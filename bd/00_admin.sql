CREATE USER 'admin_videoteca'@'localhost' IDENTIFIED BY 'Adm!nVhs2026';

GRANT ALL ON videoteca.* TO 'admin_videoteca'@'localhost' WITH GRANT OPTION;
GRANT CREATE USER, ROLE_ADMIN ON *.* TO 'admin_videoteca'@'localhost';

SET PERSIST log_bin_trust_function_creators = 1;
