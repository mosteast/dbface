import * as events from 'events';
import { cloneDeep, merge } from 'lodash';
import { resolve } from 'path';
import { Pool, PoolClient, PoolConfig, QueryConfig } from 'pg';
import { pwd } from 'shelljs';
import { IN_query, N_db_type, T_config_connection, T_connection, T_opt_log, T_result } from '../../rds/connection';
import { T_row_database, table_migration, table_system } from '../../type';
import { key_replace } from '../../util/obj';

const e = require('pg-escape');

const env = process.env;

export class Connection_postgres extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection_postgres = {
    dialect: N_db_type.postgres,
    host: env.dbface_type,
    port: +env.dbface_port!,
    user: env.dbface_user,
    password: env.dbface_password,
    uri: env.dbface_uri,
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

  pool!: Pool;
  client!: PoolClient;
  raw_config!: PoolConfig;
  config!: T_config_connection_postgres;

  constructor(config?: T_config_connection) {
    super();
    if (config) { this.set_config(config); }
  }

  async connect(): Promise<void> {
    if ( ! this.pool) {
      const conf = this.raw_config;
      // If is pure connection
      if (this.constructor.name === Connection_postgres.name) {
        delete conf.database; // delete database option to prevent database not exist exception
      }

      this.pool = new Pool(conf);
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
        c.log.logger = (...args: any) => console.info('●', ...args);
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

  async database_list(): Promise<T_result<T_row_database>> {
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

  async database_ensure(name: string): Promise<T_row_database> {
    const exist = await this.database_pick(name);
    if (exist) { return exist; }

    return await this.database_create(name);
  }

  async query<T = any, T_params = any>(opt: IN_query<T_params>): Promise<T_result<T>>;
  async query<T = any, T_params = any>(sql: string, params?: T_params): Promise<T_result<T>>;
  async query<T = any, T_params = any>(a: any, b?: any) {
    let opt: IN_query = {};
    if (typeof a === 'string') {
      opt.sql = a;
      opt.params = b;
    } else {
      opt = a;
    }

    const r = await this.client.query({ text: opt.sql, values: opt.params } as QueryConfig);
    return key_replace<T_result<T>>(r, { rowCount: 'count' });
  }

  log({ sql, params }: IN_query) {
    const log: T_opt_log = this.config.log as T_opt_log;
    if (log) {
      let param_part = '';
      if (log.log_params && params) {
        param_part = '-- ' + JSON.stringify(params);
      }

      log.logger!(sql, param_part);
    }
  }
}

export interface T_config_connection_postgres extends T_config_connection {
  dialect: N_db_type.postgres
}