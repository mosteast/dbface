import * as events from 'events';
import { cloneDeep, merge } from 'lodash';
import { resolve } from 'path';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { pwd } from 'shelljs';
import { IN_query, N_db_type, T_config_connection, T_connection, T_opt_log } from '../../connection/connection';
import { T_row_database, table_migration, table_system } from '../../type';
import { key_replace } from '../../util/obj';

const e = require('pg-escape');

const env = process.env;

export class Connection_postgres extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection_postgres | any = {
    type: N_db_type.postgres,
    host: env.ormx_type,
    port: env.ormx_port,
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
  client: PoolClient;
  raw_config: PoolConfig;
  config: T_config_connection_postgres;

  async connect(): Promise<void> {
    if ( ! this.pool) {
      this.pool = new Pool(this.raw_config);
    }

    this.client = await this.pool.connect();
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
    this.raw_config = copy;
    key_replace(this.raw_config, { uri: 'connectionString' });
  }

  validate_config(): void {}

  async ping() {
    return !! await this.server_version();
  }

  async server_version(): Promise<string> {
    const r = await this.query('select version()');
    return r.rows[0].version;
  }

  async database_create(name: string): Promise<T_row_database> {
    await this.query(e(`create database "%I"`, name));
    return this.database_pick(name);
  }

  async database_drop(name: string): Promise<void> {
    await this.query(e(`drop database if exists "%I"`, name));
  }

  async database_list(): Promise<T_row_database[]> {
    return this.query(`
select d.datname as "name",
       pg_catalog.pg_get_userbyid(d.datdba) as "owner",
       pg_catalog.pg_encoding_to_char(d.encoding) as "encoding",
       d.datcollate as "collate"
from pg_catalog.pg_database d
order by 1;`.trim());
  }

  async database_pick(name: string): Promise<T_row_database> {
    const r = await this.query(`
select d.datname as "name",
       pg_catalog.pg_get_userbyid(d.datdba) as "owner",
       pg_catalog.pg_encoding_to_char(d.encoding) as "encoding",
       d.datcollate as "collate"
from pg_catalog.pg_database d
where d.datname = $1
limit 1`.trim(), [ name ]);

    return r.rows[0];
  }

  async databases_ensure(name: string): Promise<T_row_database> {
    const exist = await this.database_pick(name);
    if (exist) { return exist; }

    return await this.database_create(name);
  }

  async query<T = any, T_params = any>(opt: IN_query<T_params>): Promise<T>;
  async query<T = any, T_params = any>(sql: string, params?: T_params): Promise<T>;
  async query<T = any, T_params = any>(a, b?) {
    let opt: IN_query = {};
    if (typeof a === 'string') {
      opt.sql = a;
      opt.params = b;
    } else {
      opt = a;
    }

    this.log(opt);
    const r = await this.client.query<T>({ text: opt.sql, values: opt.params });
    return key_replace(r, { rowCount: 'count' });
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

export interface T_config_connection_postgres extends T_config_connection {
  type: N_db_type.postgres
}