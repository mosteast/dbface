import * as events from 'events';
import { cloneDeep, merge } from 'lodash';
import { createPool, Pool, PoolOptions } from 'mysql2/promise';
import { resolve } from 'path';
import { pwd } from 'shelljs';
import { IN_query, N_db_type, T_config_connection, T_connection, T_opt_log, T_result } from '../../connection/connection';
import { T_row_database, table_migration, table_system } from '../../type';
import { key_replace } from '../../util/obj';

export interface T_config_connection_mysql extends T_config_connection {
  dialect: N_db_type.mysql
}

const env = process.env;

export class Connection_mysql extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection_mysql = {
    dialect: N_db_type.mysql,
    host: env.ormx_type,
    port: +env.ormx_port,
    user: env.ormx_user,
    password: env.ormx_password,
    uri: env.ormx_uri,
    migration: {
      table_name: table_migration,
      file_dir: resolve(pwd().toString(), 'database/migration'),
      migration_file_suffix: '.m',
    },
    system: {
      table_name: table_system,
      ensure_database: true,
    },
  };

  pool: Pool;
  raw_config: PoolOptions;
  config: T_config_connection_mysql;

  constructor(config?: T_config_connection) {
    super();
    if (config) { this.set_config(config); }
  }

  async connect(): Promise<void> {
    if ( ! this.pool) {
      const conf = this.raw_config;
      // If is pure connection
      if (this.constructor.name === Connection_mysql.name) {
        delete conf.database; // delete database option to prevent database not exist exception
      }

      this.pool = createPool(this.raw_config);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  get_config(): T_config_connection {
    return this.config;
  }

  set_config(config: T_config_connection): void {
    // @ts-ignore
    const c: T_config_connection = this.config = merge((this.constructor).def, config);

    if (c.log) {
      switch (typeof c.log) {
        case 'function':
          c.log = { logger: c.log };
          break;
        case 'boolean':
          c.log = {};
          break;
      }

      if ( ! c.log?.logger) {
        c.log.logger = (...args) => console.info('●', ...args);
      }
    } else {
      c.log = false;
    }

    this.adapt_config();
  }

  adapt_config(): void {
    const copy: any = cloneDeep(this.config);
    delete copy.log;
    delete copy.migration;
    delete copy.system;
    delete copy.dialect;

    this.raw_config = copy;
    // key_replace(this.raw_config, { uri: 'connectionString', username: 'user' });
  }

  validate_config(): void {}

  async ping() {
    return !! await this.server_version();
  }

  async server_version(): Promise<string> {
    const r = await this.query('select version() as version');
    return r[0][0].version;
  }

  async database_create(name: string): Promise<T_row_database> {
    await this.query(`create database ??`, [ name ]);
    return this.database_pick(name);
  }

  async database_drop(name: string): Promise<void> {
    await this.query(`drop database if exists ??`, [ name ]);
  }

  async database_list(): Promise<T_result<T_row_database>> {
    return this.query(`
select schema_name as \`name\`, default_character_set_name as \`encoding\`, default_collation_name as \`collate\`
from information_schema.schemata`.trim());
  }

  async database_pick(name: string): Promise<T_row_database> {
    const r = await this.query(`
select schema_name as \`name\`, default_character_set_name as \`encoding\`, default_collation_name as \`collate\`
from information_schema.schemata
where schema_name = ?`.trim(), [ name ]);
    return r[0][0];
  }

  async database_ensure(name: string): Promise<T_row_database> {
    const exist = await this.database_pick(name);
    if (exist) { return exist; }

    return await this.database_create(name);
  }

  async query<T = any, T_params = any>(opt: IN_query<T_params>): Promise<T_result<T>>;
  async query<T = any, T_params = any>(sql: string, params?: T_params): Promise<T_result<T>>
  async query<T = any, T_params = any>(a, b?) {
    let opt: IN_query = {};
    if (typeof a === 'string') {
      opt.sql = a;
      opt.params = b;
    } else {
      opt = a;
    }

    const r = await this.pool.query({ sql: opt.sql, values: opt.params });
    return key_replace<T_result<T>>(r, { rowCount: 'count' });
  }

  log({ sql, params }: IN_query) {
    const log: T_opt_log = this.config.log as T_opt_log;
    if (log) {
      let param_part = '';
      if (log.log_params && params) {
        param_part = '-- ' + JSON.stringify(params);
      }

      log.logger(sql, param_part);
    }
  }
}
