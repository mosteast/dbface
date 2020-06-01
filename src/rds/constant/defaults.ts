import { merge } from 'lodash';
import { resolve } from 'path';
import { pwd } from 'shelljs';
import { T_config_connection_mysql } from '../../adapter/mysql/connection_mysql';
import { T_config_database_mysql } from '../../adapter/mysql/database_mysql';
import { T_config_connection_postgres } from '../../adapter/postgres/connection_postgres';
import { T_config_database_postgres } from '../../adapter/postgres/database_postgres';
import { N_dialect, T_config_connection, T_config_database } from '../../type';

const env = process.env;

/**
 * Default connection configuration as a base to merge
 */
export const def_connection: T_config_connection = {
  host: env.dbface_host,
  port: +env.dbface_port!,
  user: env.dbface_user,
  password: env.dbface_password,
  uri: env.dbface_uri,
};

export const def_connection_mysql: T_config_connection_mysql = merge(def_connection, { dialect: N_dialect.mysql } as T_config_connection_mysql);
export const def_connection_postgres: T_config_connection_postgres = merge(def_connection, { dialect: N_dialect.postgres } as T_config_connection_postgres);

export const def_database: T_config_database = merge(def_connection, {
  migration: {
    file_dir: resolve(pwd().toString(), 'migration'),
    migration_file_suffix: '.m',
  },
  state: {
    table_name: 'dbface_state',
    ensure_database: true,
  },
} as T_config_database);

export const def_database_mysql: T_config_database_mysql = merge(def_database, { dialect: N_dialect.mysql } as T_config_database_mysql);
export const def_database_postgres: T_config_database_postgres = merge(def_database, { dialect: N_dialect.postgres } as T_config_database_postgres);

